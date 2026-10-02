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


def launch_chromium(pw, *, headless: bool = True, proxy: Proxy | None = None, args: list[str] | None = None):
    """Launch Chromium honouring ``AUTOTOK_BROWSER_PATH`` / ``AUTOTOK_BROWSER_CHANNEL``."""
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
    if proxy is not None:
        kwargs["proxy"] = proxy.for_playwright()
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
