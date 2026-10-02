"""Account files on the shared volume, via ``autotok.AccountStore``.

The CLI and the web app share the same store (``$AUTOTOK_HOME/accounts``), so
an account logged in with ``autotok login`` shows up after "Import from disk".
"""
from __future__ import annotations

from typing import Iterable

from autotok import Account, AccountStore, Proxy
from autotok.errors import AccountNotFoundError


def store() -> AccountStore:
    return AccountStore()


def exists(username: str) -> bool:
    return store().exists(username)


def file_path(username: str) -> str:
    return str(store().path_for(username))


def load(username: str) -> Account:
    return store().load(username)


def save(username: str, cookies: Iterable[dict], *, user_agent: str | None = None,
         proxy: str | None = None) -> str:
    s = store()
    account = Account(name=username, cookies=list(cookies), user_agent=user_agent, proxy=proxy)
    return str(s.save(account))


def delete(username: str) -> None:
    store().delete(username)


def list_usernames_on_disk() -> list[str]:
    return store().list()


def has_valid_session(username: str) -> bool:
    try:
        return load(username).has_session
    except Exception:
        return False


def get_proxy(username: str) -> Proxy | None:
    try:
        return load(username).get_proxy()
    except AccountNotFoundError:
        return None


def set_proxy(username: str, proxy: str | None) -> Proxy | None:
    return store().set_proxy(username, proxy).get_proxy()
