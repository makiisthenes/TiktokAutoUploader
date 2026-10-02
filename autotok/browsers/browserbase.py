"""Browserbase cloud browsers (https://www.browserbase.com).

Sessions are created over Browserbase's REST API and driven with Playwright's
``connect_over_cdp``. Logging in happens through the session's live view, a
link you open in your own browser.

Environment variables:

``BROWSERBASE_API_KEY``
    Required. Browserbase dashboard → Settings → API keys.
``BROWSERBASE_PROJECT_ID``
    Optional; Browserbase infers it from the API key when omitted.
``BROWSERBASE_REGION``
    Optional, e.g. ``eu-central-1`` (Browserbase's default is ``us-west-2``).

Account proxies are applied as Browserbase "external" proxies, which need a
Developer plan or higher and must be HTTP or HTTPS.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field

import requests

from ..errors import ConfigurationError, RemoteBrowserError, ValidationError
from ..proxy import Proxy
from .base import CloudProvider, CloudSession
from .http import error_detail

log = logging.getLogger("autotok")

API_URL = "https://api.browserbase.com/v1"
MIN_TIMEOUT, MAX_TIMEOUT = 60, 21_600  # seconds, Browserbase's allowed range
_HTTP_TIMEOUT = 30


def _headers(key: str) -> dict:
    return {"X-BB-API-Key": key, "Content-Type": "application/json"}


def _proxy_config(proxy: Proxy) -> dict:
    """Browserbase "external" proxy entry for an account proxy (HTTP/HTTPS only)."""
    if proxy.scheme not in ("http", "https"):
        raise ValidationError(
            f"Browserbase only supports HTTP/HTTPS proxies, not {proxy.scheme}. "
            "Use your provider's HTTP endpoint for this account."
        )
    server = proxy.for_playwright()
    config = {"type": "external", "server": server["server"]}
    if "username" in server:
        config["username"] = server["username"]
        config["password"] = server["password"]
    return config


@dataclass
class BrowserbaseSession(CloudSession):
    id: str
    connect_url: str = field(repr=False)  # contains a signed token
    api_key: str = field(repr=False)

    def live_view_url(self) -> str:
        try:
            r = requests.get(f"{API_URL}/sessions/{self.id}/debug", headers=_headers(self.api_key),
                             timeout=_HTTP_TIMEOUT)
            r.raise_for_status()
            return r.json()["debuggerFullscreenUrl"]
        except (requests.RequestException, ValueError, KeyError) as exc:
            raise RemoteBrowserError(f"could not get the Browserbase live view link: {exc}") from None

    def release(self) -> None:
        try:
            requests.post(f"{API_URL}/sessions/{self.id}", headers=_headers(self.api_key),
                          json={"status": "REQUEST_RELEASE"}, timeout=_HTTP_TIMEOUT)
        except requests.RequestException as exc:
            log.debug("could not release Browserbase session %s: %s", self.id, exc)


class BrowserbaseProvider(CloudProvider):
    label = "Browserbase"

    @staticmethod
    def api_key() -> str:
        key = (os.environ.get("BROWSERBASE_API_KEY") or "").strip()
        if not key:
            raise ConfigurationError(
                "AUTOTOK_BROWSER=browserbase needs BROWSERBASE_API_KEY "
                "(Browserbase dashboard → Settings → API keys)"
            )
        return key

    def create_session(self, *, proxy: Proxy | None = None, timeout: float | None = None) -> BrowserbaseSession:
        key = self.api_key()
        body: dict = {}
        project = (os.environ.get("BROWSERBASE_PROJECT_ID") or "").strip()
        if project:
            body["projectId"] = project
        region = (os.environ.get("BROWSERBASE_REGION") or "").strip()
        if region:
            body["region"] = region
        if timeout is not None:
            body["timeout"] = max(MIN_TIMEOUT, min(MAX_TIMEOUT, int(timeout)))
        if proxy is not None:
            body["proxies"] = [_proxy_config(proxy)]

        try:
            r = requests.post(f"{API_URL}/sessions", headers=_headers(key), json=body, timeout=_HTTP_TIMEOUT)
        except requests.RequestException as exc:
            raise RemoteBrowserError(f"could not reach Browserbase: {exc}") from None
        if r.status_code in (401, 403):
            raise ConfigurationError(f"Browserbase rejected the API key (HTTP {r.status_code}): {error_detail(r)}")
        if r.status_code >= 400:
            raise RemoteBrowserError(f"Browserbase could not start a session (HTTP {r.status_code}): {error_detail(r)}")
        try:
            data = r.json()
            session = BrowserbaseSession(id=data["id"], connect_url=data["connectUrl"], api_key=key)
        except (ValueError, KeyError):
            raise RemoteBrowserError("unexpected response from Browserbase when starting a session") from None
        log.debug("started Browserbase session %s", session.id)
        return session
