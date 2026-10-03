"""Browser-based login flow via noVNC.

  POST /api/login/browser/start   → creates a LoginSession row, asks the
      noVNC control server to open Chromium at tiktok.com/login (through the
      account's proxy, if given), returns a session_id + vnc_url the frontend
      embeds in an iframe.

  GET  /api/login/browser/{id}/events → SSE stream of status transitions. It
      also polls the control server, so a login that times out or whose
      browser crashes is reported as failed instead of hanging.

  POST /api/login/browser/{id}/complete?token=… → called by the control server
      once it sees the session cookies. The token is an HMAC of the session id,
      so only the control server we started can complete a login. The API (not
      noVNC) saves the account and upserts the Account row.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import os
import secrets
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlmodel import Session, select
from sse_starlette.sse import EventSourceResponse
from starlette.concurrency import run_in_threadpool

from api.db import get_session, now_utc
from api.models import Account, LoginSession
from api.schemas import (
    LoginBrowserCompleteRequest,
    LoginBrowserStartRequest,
    LoginBrowserStartResponse,
    LoginSessionRead,
)
from api.services import account_store, novnc_client
from autotok import settings

router = APIRouter(prefix="/api/login/browser", tags=["login"])

TERMINAL = ("completed", "failed", "expired")
_secret: bytes | None = None


def _callback_secret() -> bytes:
    """AUTOTOK_CALLBACK_SECRET, or a random secret persisted (0600) in
    $AUTOTOK_HOME so it survives API restarts during a 10-minute login."""
    global _secret
    env = os.getenv("AUTOTOK_CALLBACK_SECRET")
    if env:
        return env.encode()
    if _secret is None:
        path = settings.home() / ".callback_secret"
        if not path.is_file():
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_name(f".callback_secret.{os.getpid()}.tmp")
            fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w") as f:
                f.write(secrets.token_hex(32))
            try:
                os.link(tmp, path)  # atomic: if another worker won the race, keep theirs
            except FileExistsError:
                pass
            except OSError:  # filesystem without hard links
                if not path.exists():
                    os.replace(tmp, path)
            finally:
                if tmp.exists():
                    os.unlink(tmp)
        _secret = path.read_text().strip().encode()
    return _secret


def callback_token(session_id: str) -> str:
    return hmac.new(_callback_secret(), session_id.encode(), hashlib.sha256).hexdigest()


def _callback_url() -> str:
    """URL the noVNC control server posts back to. Inside the compose network
    it's http://api:8000/api/login/browser/{id}/complete."""
    base = os.getenv("API_PUBLIC_URL", "http://api:8000")
    return base.rstrip("/")


def _fail(session: Session, row: LoginSession, error: str) -> None:
    row.status = "failed"
    row.error = error
    row.completed_at = now_utc()
    session.add(row)
    session.commit()


@router.post("/start", response_model=LoginBrowserStartResponse, status_code=status.HTTP_201_CREATED)
def start_browser_login(
    payload: LoginBrowserStartRequest,
    session: Session = Depends(get_session),
):
    # One virtual browser at a time: a new login replaces any earlier one that
    # was abandoned (closed tab, refresh) instead of waiting for its timeout.
    for old in session.exec(select(LoginSession).where(LoginSession.status.in_(("pending", "active")))).all():
        old.status = "expired"
        old.error = "replaced by a newer login"
        old.completed_at = now_utc()
        session.add(old)
        novnc_client.stop_browser(old.id)
    session.commit()

    sid = uuid.uuid4().hex
    vnc_url = novnc_client.build_vnc_url(sid)
    row = LoginSession(id=sid, username=payload.username, status="pending", vnc_url=vnc_url)
    session.add(row)
    session.commit()

    callback = f"{_callback_url()}/api/login/browser/{sid}/complete?token={callback_token(sid)}"
    # Re-logins keep using the account's saved proxy unless a new one is given.
    saved = account_store.get_proxy(payload.username)
    proxy = payload.proxy or (saved.url if saved else None)
    try:
        novnc_client.start_browser(sid, payload.username, callback, proxy=proxy)
    except Exception as e:
        _fail(session, row, f"noVNC start failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    row.status = "active"
    session.add(row)
    session.commit()
    return LoginBrowserStartResponse(session_id=sid, vnc_url=vnc_url)


@router.get("/{session_id}", response_model=LoginSessionRead)
def get_browser_session(session_id: str, session: Session = Depends(get_session)):
    row = session.get(LoginSession, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="login session not found")
    return row


def _sync_with_control_server(session_id: str) -> None:
    """Mark an active login failed if the control server says it failed or lost it."""
    import api.db as _api_db

    try:
        remote = novnc_client.browser_status(session_id)
    except Exception:
        return  # control server briefly unreachable; try again next poll
    if remote.get("status") not in ("failed", "missing"):
        return
    with Session(_api_db.engine) as s:
        row = s.get(LoginSession, session_id)
        if row and row.status == "active":
            _fail(s, row, remote.get("error") or "login failed in the virtual browser")


@router.get("/{session_id}/events")
async def browser_events(session_id: str, request: Request):
    """Server-Sent Events: emits one event per status transition, terminates
    when the session enters a terminal state or the client disconnects.

    Note: nginx must have proxy_buffering off on this path (see web/frontend/nginx.conf)."""

    async def stream() -> AsyncIterator[dict]:
        import api.db as _api_db  # honour test fixtures that swap the engine

        last_status: str | None = None
        polls = 0
        while True:
            if await request.is_disconnected():
                break
            with Session(_api_db.engine) as s:
                row = s.get(LoginSession, session_id)
                if not row:
                    # Not named "error": that would fire EventSource.onerror in the browser.
                    yield {"event": "failure", "data": "unknown login session"}
                    yield {"event": "status", "data": "failed"}
                    return
                status_now, error = row.status, row.error
            if status_now != last_status:
                last_status = status_now
                # The client closes the stream on a terminal status, so the
                # reason has to arrive first.
                if status_now == "failed" and error:
                    yield {"event": "failure", "data": error}
                yield {"event": "status", "data": status_now}
            if status_now in TERMINAL:
                return
            polls += 1
            if status_now == "active" and polls % 3 == 0:
                await run_in_threadpool(_sync_with_control_server, session_id)
            await asyncio.sleep(1.0)

    return EventSourceResponse(stream())


@router.post("/{session_id}/complete", response_model=LoginSessionRead)
def complete_browser_login(
    session_id: str,
    payload: LoginBrowserCompleteRequest,
    token: str = Query(default=""),
    session: Session = Depends(get_session),
):
    """Called by the noVNC control server when it sees the session cookies."""
    if not hmac.compare_digest(token, callback_token(session_id)):
        raise HTTPException(status_code=403, detail="invalid callback token")
    row = session.get(LoginSession, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="login session not found")
    if row.status == "completed":
        return row  # idempotent

    has_session = any(c.get("name") == "sessionid" and c.get("value") for c in payload.cookies)
    if not has_session:
        _fail(session, row, "no sessionid cookie in payload")
        raise HTTPException(status_code=400, detail="no sessionid cookie in payload")

    # Save the account (cookies + browser user agent + proxy) → upsert DB row.
    cookie_path = account_store.save(
        row.username, payload.cookies, user_agent=payload.user_agent, proxy=payload.proxy
    )
    acct = session.exec(select(Account).where(Account.username == row.username)).first()
    if acct is None:
        acct = Account(
            username=row.username,
            cookie_path=cookie_path,
            has_valid_session=True,
            last_used_at=now_utc(),
        )
    else:
        acct.cookie_path = cookie_path
        acct.has_valid_session = True
        acct.last_used_at = now_utc()
        acct.updated_at = now_utc()
    session.add(acct)

    row.status = "completed"
    row.completed_at = now_utc()
    session.add(row)
    session.commit()
    session.refresh(row)
    # Best-effort teardown of the browser on the control container.
    novnc_client.stop_browser(session_id)
    return row


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_browser_login(session_id: str, session: Session = Depends(get_session)):
    row = session.get(LoginSession, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="login session not found")
    if row.status in TERMINAL:
        return Response(status_code=204)
    row.status = "expired"
    row.completed_at = now_utc()
    session.add(row)
    session.commit()
    novnc_client.stop_browser(session_id)
