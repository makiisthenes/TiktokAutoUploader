"""Saved TikTok sessions.

Each account is one JSON file in ``$AUTOTOK_HOME/accounts/<name>.json`` holding
the TikTok cookies, the user agent of the browser that logged in, and the
account's proxy. Files are written with ``0600`` permissions: a ``sessionid``
cookie is full access to the TikTok account.

Sessions saved by TiktokAutoUploader 1.x (pickled ``CookiesDir/tiktok_session-
<name>.cookie`` files) are found automatically and migrated on first use. They
are read with a restricted unpickler that only accepts plain data, so a
tampered cookie file cannot execute code.
"""
from __future__ import annotations

import json
import logging
import os
import pickle
import re
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from . import settings
from .errors import AccountNotFoundError, ValidationError
from .proxy import Proxy, parse_proxy

log = logging.getLogger("autotok")

SESSION_COOKIE = "sessionid"
DATACENTER_COOKIE = "tt-target-idc"
LEGACY_PREFIX = "tiktok_session-"
LEGACY_SUFFIX = ".cookie"

_NAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{1,128}$")


def validate_account_name(name: str) -> str:
    if not isinstance(name, str) or not _NAME_RE.match(name) or name in (".", ".."):
        raise ValidationError(
            f"invalid account name {name!r}: use 1-128 letters, digits, '.', '_' or '-'"
        )
    return name


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class Account:
    name: str
    cookies: list[dict] = field(default_factory=list)
    user_agent: str | None = None
    proxy: str | None = None
    created_at: str = field(default_factory=_now)
    updated_at: str = field(default_factory=_now)

    def __post_init__(self) -> None:
        validate_account_name(self.name)
        if self.proxy is not None:
            parsed = parse_proxy(self.proxy)
            self.proxy = parsed.url if parsed else None

    def cookie(self, name: str) -> str | None:
        for c in self.cookies:
            if c.get("name") == name and c.get("value"):
                return str(c["value"])
        return None

    @property
    def session_id(self) -> str | None:
        return self.cookie(SESSION_COOKIE)

    @property
    def datacenter(self) -> str | None:
        return self.cookie(DATACENTER_COOKIE)

    @property
    def has_session(self) -> bool:
        return self.session_id is not None

    def get_proxy(self) -> Proxy | None:
        return parse_proxy(self.proxy)

    @classmethod
    def from_session_id(cls, name: str, session_id: str, *, datacenter: str | None = None,
                        user_agent: str | None = None, proxy: "str | Proxy | None" = None) -> "Account":
        """Build an account from a ``sessionid`` copied out of a browser."""
        if not session_id or not session_id.strip():
            raise ValidationError("session id is empty")
        cookies = [_cookie(SESSION_COOKIE, session_id.strip())]
        if datacenter:
            cookies.append(_cookie(DATACENTER_COOKIE, datacenter.strip()))
        p = parse_proxy(proxy)
        return cls(name=name, cookies=cookies, user_agent=user_agent, proxy=p.url if p else None)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "cookies": self.cookies,
            "user_agent": self.user_agent,
            "proxy": self.proxy,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Account":
        return cls(
            name=data["name"],
            cookies=list(data.get("cookies") or []),
            user_agent=data.get("user_agent"),
            proxy=data.get("proxy"),
            created_at=data.get("created_at") or _now(),
            updated_at=data.get("updated_at") or _now(),
        )


def _cookie(name: str, value: str) -> dict:
    return {"name": name, "value": value, "domain": ".tiktok.com", "path": "/"}


class _PlainDataUnpickler(pickle.Unpickler):
    """Only lists/dicts/str/numbers/bools/None: refuse every class lookup."""

    def find_class(self, module, name):  # noqa: D401
        raise pickle.UnpicklingError(f"refusing to load {module}.{name} from a cookie file")


def read_legacy_cookie_file(path: Path) -> list[dict]:
    with open(path, "rb") as f:
        data = _PlainDataUnpickler(f).load()
    if not isinstance(data, list) or not all(isinstance(c, dict) for c in data):
        raise ValueError(f"{path} is not a list of cookies")
    return data


class AccountStore:
    def __init__(self, root: "str | Path | None" = None, legacy_dirs: "list[Path] | None" = None):
        self.root = Path(root) if root else settings.accounts_dir()
        self.legacy_dirs = settings.legacy_cookie_dirs() if legacy_dirs is None else list(legacy_dirs)

    def path_for(self, name: str) -> Path:
        return self.root / f"{validate_account_name(name)}.json"

    def _legacy_path(self, name: str) -> Path | None:
        for d in self.legacy_dirs:
            p = d / f"{LEGACY_PREFIX}{name}{LEGACY_SUFFIX}"
            if p.is_file():
                return p
        return None

    def exists(self, name: str) -> bool:
        return self.path_for(name).is_file() or self._legacy_path(name) is not None

    def load(self, name: str) -> Account:
        path = self.path_for(name)
        if path.is_file():
            with open(path, encoding="utf-8") as f:
                return Account.from_dict(json.load(f))
        legacy = self._legacy_path(name)
        if legacy is None:
            raise AccountNotFoundError(
                f"no saved session for '{name}'. Run: autotok login -n {name}"
            )
        account = Account(name=name, cookies=read_legacy_cookie_file(legacy))
        self.save(account)
        log.info("Migrated legacy session %s to %s", legacy, path)
        return account

    def save(self, account: Account) -> Path:
        self.root.mkdir(parents=True, exist_ok=True)
        path = self.path_for(account.name)
        account.updated_at = _now()
        payload = json.dumps(account.to_dict(), indent=2)
        fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=self.root)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(payload)
            os.chmod(tmp, 0o600)
            os.replace(tmp, path)
        except BaseException:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise
        return path

    def delete(self, name: str) -> bool:
        """Delete the saved session (and its legacy file, if any)."""
        removed = False
        path = self.path_for(name)
        if path.is_file():
            path.unlink()
            removed = True
        legacy = self._legacy_path(name)
        if legacy is not None:
            legacy.unlink()
            removed = True
        return removed

    def list(self) -> list[str]:
        names: set[str] = set()
        if self.root.is_dir():
            names.update(p.stem for p in self.root.glob("*.json") if _NAME_RE.match(p.stem))
        for d in self.legacy_dirs:
            if d.is_dir():
                for p in d.iterdir():
                    n = p.name
                    if n.startswith(LEGACY_PREFIX) and n.endswith(LEGACY_SUFFIX):
                        stem = n[len(LEGACY_PREFIX):-len(LEGACY_SUFFIX)]
                        if _NAME_RE.match(stem):
                            names.add(stem)
        return sorted(names)

    def set_proxy(self, name: str, proxy: "str | Proxy | None") -> Account:
        account = self.load(name)
        p = parse_proxy(proxy)
        account.proxy = p.url if p else None
        self.save(account)
        return account
