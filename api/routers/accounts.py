"""CRUD on TikTok accounts. An account is a username paired with a saved
session file in the autotok account store. Creating an account here does NOT
log in — it registers a session that already exists (from ``autotok login`` or
a prior browser login). Use /api/login/browser/* for the in-browser login flow.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from api.db import get_session, now_utc
from api.models import Account
from api.schemas import AccountCreate, AccountRead, AccountUpdate, SessionCheckResponse
from api.services import account_store
from autotok import Client
from autotok.errors import AutotokError, NotLoggedInError

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def to_read(acct: Account) -> AccountRead:
    proxy = account_store.get_proxy(acct.username)
    data = AccountRead.model_validate(acct).model_dump()
    data["proxy"] = proxy.masked() if proxy else None
    return AccountRead(**data)


def _get(session: Session, account_id: int) -> Account:
    acct = session.get(Account, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="account not found")
    return acct


@router.get("", response_model=List[AccountRead])
def list_accounts(session: Session = Depends(get_session)):
    return [to_read(a) for a in session.exec(select(Account).order_by(Account.username)).all()]


@router.get("/{account_id}", response_model=AccountRead)
def get_account(account_id: int, session: Session = Depends(get_session)):
    return to_read(_get(session, account_id))


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, session: Session = Depends(get_session)):
    # Require the session file to already exist. This endpoint is how CLI-
    # created sessions get promoted into the DB; it is NOT how new logins happen.
    if not account_store.exists(payload.username):
        raise HTTPException(
            status_code=400,
            detail=(
                f"No saved session for '{payload.username}'. "
                "Log in first (autotok login, or /api/login/browser/start)."
            ),
        )
    existing = session.exec(select(Account).where(Account.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="account with that username already exists")

    acct = Account(
        username=payload.username,
        display_name=payload.display_name,
        cookie_path=account_store.file_path(payload.username),
        has_valid_session=account_store.has_valid_session(payload.username),
    )
    session.add(acct)
    session.commit()
    session.refresh(acct)
    return to_read(acct)


@router.patch("/{account_id}", response_model=AccountRead)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    session: Session = Depends(get_session),
):
    acct = _get(session, account_id)
    if payload.display_name is not None:
        acct.display_name = payload.display_name
    if payload.proxy is not None:
        try:
            account_store.set_proxy(acct.username, payload.proxy or None)
        except AutotokError as e:
            raise HTTPException(status_code=400, detail=str(e))
    acct.updated_at = now_utc()
    session.add(acct)
    session.commit()
    session.refresh(acct)
    return to_read(acct)


@router.post("/{account_id}/check", response_model=SessionCheckResponse)
def check_account_session(account_id: int, session: Session = Depends(get_session)):
    """Ask TikTok whether the saved session still works (through the account's proxy).

    Only TikTok rejecting the session marks it invalid; a network or proxy
    failure is reported as 502 and leaves the stored state alone."""
    acct = _get(session, account_id)
    try:
        valid = Client.from_account(acct.username).check_session()
    except NotLoggedInError:
        valid = False
    except AutotokError as e:
        raise HTTPException(status_code=502, detail=str(e)) from None
    acct.has_valid_session = valid
    acct.updated_at = now_utc()
    session.add(acct)
    session.commit()
    return SessionCheckResponse(valid=valid)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, session: Session = Depends(get_session)):
    acct = _get(session, account_id)
    # Delete DB row first — if file deletion fails afterwards the user can
    # still re-import. The reverse is harder to recover from.
    username = acct.username
    session.delete(acct)
    session.commit()
    account_store.delete(username)


@router.post("/import-from-disk", response_model=List[AccountRead])
def import_from_disk(session: Session = Depends(get_session)):
    """Register saved sessions that are not in the DB yet. Users who log in
    with `autotok login -n foo` can click one button in the UI to see them."""
    imported: list[Account] = []
    existing = {a.username for a in session.exec(select(Account)).all()}
    for username in account_store.list_usernames_on_disk():
        if username in existing:
            continue
        acct = Account(
            username=username,
            cookie_path=account_store.file_path(username),
            has_valid_session=account_store.has_valid_session(username),
        )
        session.add(acct)
        imported.append(acct)
    session.commit()
    for a in imported:
        session.refresh(a)
    return [to_read(a) for a in imported]
