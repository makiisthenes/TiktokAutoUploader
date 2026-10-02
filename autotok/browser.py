"""Shared Playwright/Chromium launch helpers."""
from __future__ import annotations

import subprocess
import sys

from . import settings
from .errors import BrowserNotInstalledError, MissingDependencyError
from .proxy import Proxy

# Hide the most obvious automation flags from the pages we open.
STEALTH_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
]


def sync_playwright():
    try:
        from playwright.sync_api import sync_playwright as _sp
    except ImportError as exc:  # pragma: no cover - playwright is a core dependency
        raise MissingDependencyError("playwright is not installed: pip install autotok") from exc
    return _sp()


# A proxy nobody listens on: used to make a browser fail closed.
_BLACKHOLE_PROXY = {"server": "http://127.0.0.1:9"}


def launch_chromium(pw, *, headless: bool = True, proxy: Proxy | None = None,
                    args: list[str] | None = None, offline: bool = False):
    """Launch Chromium honouring ``AUTOTOK_BROWSER_PATH`` / ``AUTOTOK_BROWSER_CHANNEL``.

    ``offline=True`` routes the browser through a dead proxy so it cannot make
    any direct connection (requests must be fulfilled by a route handler).
    """
    from playwright.sync_api import Error as PlaywrightError

    kwargs: dict = {
        "headless": headless,
        "args": STEALTH_ARGS + list(args or []),
        "ignore_default_args": ["--enable-automation"],
    }
    executable = settings.browser_executable()
    channel = settings.browser_channel()
    if executable:
        kwargs["executable_path"] = executable
    elif channel:
        kwargs["channel"] = channel
    if offline:
        kwargs["proxy"] = _BLACKHOLE_PROXY
    elif proxy is not None:
        kwargs["proxy"] = proxy.for_playwright()
        # Stop WebRTC from revealing the real IP over UDP, around the proxy.
        kwargs["args"].append("--force-webrtc-ip-handling-policy=disable_non_proxied_udp")
    try:
        return pw.chromium.launch(**kwargs)
    except PlaywrightError as exc:
        msg = str(exc)
        if "Executable doesn't exist" in msg or "playwright install" in msg:
            raise BrowserNotInstalledError(
                "Chromium for Playwright is not installed. Run: autotok install-browser"
            ) from None
        raise


def install_browser(with_deps: bool = False) -> int:
    """Download Playwright's Chromium (``python -m playwright install chromium``)."""
    cmd = [sys.executable, "-m", "playwright", "install"]
    if with_deps:
        cmd.append("--with-deps")
    cmd.append("chromium")
    return subprocess.call(cmd)
