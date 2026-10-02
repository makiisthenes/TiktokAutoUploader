"""HTTP client talking to the noVNC control server (port 7900, internal).

Kept here (not inline in the router) so tests can patch the whole module and
skip spinning up a real browser container. Callers get a structured dict back
either way.
"""
from __future__ import annotations

import os

import httpx

_CONTROL_BASE = os.getenv("NOVNC_CONTROL_URL", "http://novnc:7900")
_VNC_EXTERNAL_BASE = os.getenv("NOVNC_PUBLIC_URL", "/novnc/vnc.html")
_TIMEOUT = 10.0


def build_vnc_url(session_id: str) -> str:
    """URL the frontend embeds in an iframe. The webapp's nginx proxies
    /novnc/* to the noVNC websocket on the control container."""
    return f"{_VNC_EXTERNAL_BASE}?autoconnect=1&resize=scale&path=websockify&session={session_id}"


def start_browser(session_id: str, username: str, callback_url: str, proxy: str | None = None) -> dict:
    """Ask the control server to spin up a Chromium session at tiktok.com/login.

    ``proxy`` (full URL) is applied to that browser, so the account logs in
    from the same IP it will upload from."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        r = client.post(
            f"{_CONTROL_BASE}/browser/start",
            json={"session_id": session_id, "username": username,
                  "callback_url": callback_url, "proxy": proxy},
        )
        r.raise_for_status()
        return r.json()


def browser_status(session_id: str) -> dict:
    """Poll the control server. Returns {status, error?}; status is "missing"
    when the control server no longer knows the session (e.g. it restarted)."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        r = client.get(f"{_CONTROL_BASE}/browser/status/{session_id}")
        if r.status_code == 404:
            return {"status": "missing", "error": "the virtual browser session was lost"}
        r.raise_for_status()
        return r.json()


def stop_browser(session_id: str) -> None:
    """Best-effort cleanup; don't raise on 404."""
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            client.delete(f"{_CONTROL_BASE}/browser/{session_id}")
    except httpx.HTTPError:
        pass
