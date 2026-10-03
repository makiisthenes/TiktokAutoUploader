"""noVNC control server.

The API does NOT drive the browser directly — it POSTs here, we start Chromium
(via Playwright) on the Xvfb display through the account's proxy, wait for the
TikTok session cookies, then POST cookies + user agent + proxy back to the
API's callback_url. The API is the only service that writes account files,
keeping this container stateless.

Single-slot queue: only one browser session at a time. A second start call
while one is active returns 409. This matches the realistic workload (a
single human logging in).

Playwright's sync API is bound to the thread that created it, so the worker
thread owns the browser for its whole life; other requests only flip a cancel
flag that the worker checks while it waits.
"""
from __future__ import annotations

import logging
import threading
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

from autotok.errors import AutotokError
from autotok.auth import open_login_session

log = logging.getLogger("novnc.control")
app = FastAPI(title="noVNC control server")

_POLL_TIMEOUT_SECONDS = 600  # 10-min human login window
_ACTIVE = ("starting", "active", "completing")


class _BrowserState:
    """The current login attempt. At most one at a time; guarded by ``lock``."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.session_id: Optional[str] = None
        self.status: str = "idle"  # idle|starting|active|completing|completed|failed
        self.error: Optional[str] = None
        self.cancel = threading.Event()

    def update(self, sid: str, status_: str, error: Optional[str] = None) -> None:
        """Only the worker for the current session may change the state."""
        with self.lock:
            if self.session_id == sid:
                self.status = status_
                self.error = error


_state = _BrowserState()


class StartRequest(BaseModel):
    session_id: str
    username: str
    callback_url: str
    proxy: Optional[str] = None


def _launch_and_watch(sid: str, callback_url: str, proxy: Optional[str], cancel: threading.Event) -> None:
    """Worker thread: open Chromium, wait for login, POST the result to the API."""
    _state.update(sid, "active")
    try:
        cookies, user_agent = open_login_session(
            proxy=proxy, timeout=_POLL_TIMEOUT_SECONDS, should_stop=cancel.is_set
        )
    except AutotokError as e:
        if not cancel.is_set():
            log.warning("login %s failed: %s", sid, e)
        _state.update(sid, "failed", str(e))
        return
    except Exception as e:
        log.exception("login %s crashed", sid)
        _state.update(sid, "failed", f"browser error: {e}")
        return

    _state.update(sid, "completing")
    try:
        with httpx.Client(timeout=30.0) as client:
            client.post(
                callback_url,
                json={"cookies": cookies, "user_agent": user_agent, "proxy": proxy},
                headers={"X-Requested-With": "autotok"},
            ).raise_for_status()
        _state.update(sid, "completed")
    except httpx.HTTPError as e:
        log.exception("callback POST failed")
        _state.update(sid, "failed", f"callback failed: {e}")


@app.post("/browser/start", status_code=status.HTTP_202_ACCEPTED)
def browser_start(req: StartRequest):
    with _state.lock:
        if _state.status in _ACTIVE:
            raise HTTPException(
                status_code=409,
                detail=f"another login in progress (session {_state.session_id})",
            )
        _state.cancel.set()  # stop any previous worker that is still winding down
        _state.cancel = threading.Event()
        _state.session_id = req.session_id
        _state.status = "starting"
        _state.error = None
        threading.Thread(
            target=_launch_and_watch,
            args=(req.session_id, req.callback_url, req.proxy, _state.cancel),
            daemon=True,
        ).start()
    return {"session_id": req.session_id, "status": "starting"}


@app.get("/browser/status/{session_id}")
def browser_status(session_id: str):
    with _state.lock:
        if _state.session_id != session_id:
            raise HTTPException(status_code=404, detail="unknown session")
        return {"session_id": session_id, "status": _state.status, "error": _state.error}


@app.delete("/browser/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def browser_stop(session_id: str):
    with _state.lock:
        if _state.session_id != session_id:
            return  # already gone, idempotent
        _state.cancel.set()
        _state.session_id = None
        _state.status = "idle"
        _state.error = None


@app.get("/health")
def health():
    return {"status": "ok", "browser_status": _state.status}
