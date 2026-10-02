"""Steel browsers: Steel Cloud or your own steel-browser server.

steel-browser (https://github.com/steel-dev/steel-browser) is an open-source
browser API you can run yourself, e.g.::

    docker run -p 3000:3000 ghcr.io/steel-dev/steel-browser

Environment variables:

``STEEL_BASE_URL``
    Your steel-browser server, e.g. ``http://localhost:3000``. Defaults to
    Steel Cloud (``https://api.steel.dev``).
``STEEL_API_KEY``
    Required for Steel Cloud; self-hosted servers don't need one.
``STEEL_CONNECT_URL``
    Optional CDP endpoint override, for servers behind a separate websocket host.

Notes:

* A self-hosted steel-browser runs one session at a time.
* Start a self-hosted server with ``DOMAIN=<host>:<port>`` (e.g.
  ``DOMAIN=localhost:3000``). Otherwise it reports ``0.0.0.0`` addresses: autotok
  rewrites the ones it uses, but the live view page connects to ``0.0.0.0`` by
  itself and stays blank, so logging in through it fails.
* Account proxies are passed as ``proxyUrl``; custom proxies on Steel Cloud may
  need a paid plan.
* Logging in uses the session's live view with ``interactive=true``.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import requests

from ..errors import ConfigurationError, RemoteBrowserError
from ..proxy import Proxy
from .base import CloudProvider, CloudSession
from .http import add_query, error_detail, reachable

log = logging.getLogger("autotok")

CLOUD_API_URL = "https://api.steel.dev"
CLOUD_CONNECT_URL = "wss://connect.steel.dev"
_HTTP_TIMEOUT = 30
MIN_TIMEOUT = 60  # seconds


def base_url() -> str:
    return (os.environ.get("STEEL_BASE_URL") or CLOUD_API_URL).strip().rstrip("/")


def _is_cloud(url: str) -> bool:
    return urlsplit(url).hostname == urlsplit(CLOUD_API_URL).hostname


def _headers(key: str | None) -> dict:
    headers = {"Content-Type": "application/json"}
    if key:
        headers["steel-api-key"] = key
    return headers


@dataclass
class SteelSession(CloudSession):
    id: str
    connect_url: str = field(repr=False)  # may contain the API key
    base_url: str
    debug_url: str
    api_key: str | None = field(default=None, repr=False)

    def live_view_url(self) -> str:
        # Without interactive=true the viewer is watch-only.
        return add_query(self.debug_url, "interactive=true&showControls=true")

    def release(self) -> None:
        try:
            requests.post(f"{self.base_url}/v1/sessions/{self.id}/release",
                          headers=_headers(self.api_key), timeout=_HTTP_TIMEOUT)
        except requests.RequestException as exc:
            log.debug("could not release Steel session %s: %s", self.id, exc)


class SteelProvider(CloudProvider):
    label = "Steel"

    def create_session(self, *, proxy: Proxy | None = None, timeout: float | None = None) -> SteelSession:
        base = base_url()
        key = (os.environ.get("STEEL_API_KEY") or "").strip() or None
        if _is_cloud(base) and not key:
            raise ConfigurationError(
                "AUTOTOK_BROWSER=steel needs STEEL_API_KEY for Steel Cloud, or STEEL_BASE_URL "
                "pointing at your own steel-browser server (e.g. http://localhost:3000)"
            )
        body: dict = {}
        if timeout is not None:
            body["timeout"] = int(max(MIN_TIMEOUT, timeout) * 1000)  # milliseconds
        if proxy is not None:
            body["proxyUrl"] = proxy.url

        try:
            r = requests.post(f"{base}/v1/sessions", headers=_headers(key), json=body, timeout=_HTTP_TIMEOUT)
        except requests.RequestException as exc:
            raise RemoteBrowserError(f"could not reach Steel at {base}: {exc}") from None
        if r.status_code in (401, 403):
            raise ConfigurationError(f"Steel rejected the API key (HTTP {r.status_code}): {error_detail(r)}")
        if r.status_code >= 400:
            raise RemoteBrowserError(f"Steel could not start a session (HTTP {r.status_code}): {error_detail(r)}")
        try:
            data = r.json()
            sid = data["id"]
        except (ValueError, KeyError):
            raise RemoteBrowserError("unexpected response from Steel when starting a session") from None

        override = (os.environ.get("STEEL_CONNECT_URL") or "").strip()
        if override:
            connect = add_query(override, f"sessionId={sid}")
        elif data.get("websocketUrl"):
            connect = reachable(data["websocketUrl"], base)
        else:
            connect = add_query(CLOUD_CONNECT_URL, f"sessionId={sid}")
        if key:
            connect = add_query(connect, f"apiKey={key}")
        reported = data.get("debugUrl") or data.get("websocketUrl") or ""
        if reported and reachable(reported, base) != reported:
            log.warning(
                "Steel at %s reports its address as 0.0.0.0, so its live view can't connect "
                "(logging in through it won't work). Restart steel-browser with DOMAIN=%s.",
                base, urlsplit(base).netloc,
            )
        debug = reachable(data.get("debugUrl") or f"{base}/v1/sessions/debug", base)
        log.debug("started Steel session %s", sid)
        return SteelSession(id=sid, connect_url=connect, base_url=base, debug_url=debug, api_key=key)
