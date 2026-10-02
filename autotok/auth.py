"""Logging in to TikTok and saving the session.

``login_interactive`` opens a real (headed) Chromium window on TikTok's login
page, routed through the account's proxy, and waits until TikTok sets the
``sessionid`` cookie. The cookies and the browser's user agent are saved, so
later uploads present the same browser identity that created the session.
"""
from __future__ import annotations

import logging
import time
from typing import Callable, Optional

from . import settings
from .accounts import DATACENTER_COOKIE, SESSION_COOKIE, Account, AccountStore, validate_account_name
from .browser import launch_chromium, sync_playwright
from .errors import LoginError
from .proxy import Proxy, parse_proxy

log = logging.getLogger("autotok")

REQUIRED_COOKIES = (SESSION_COOKIE, DATACENTER_COOKIE)


def wait_for_session_cookies(
    get_cookies: Callable[[], list[dict]],
    *,
    poll_interval: float = 1.0,
    timeout: float | None = None,
    should_stop: Optional[Callable[[], bool]] = None,
    sleep: Callable[[float], None] = time.sleep,
) -> list[dict]:
    """Poll ``get_cookies`` until ``sessionid`` and ``tt-target-idc`` are set.

    Returns every TikTok cookie at that moment. Raises :class:`LoginError` on
    timeout, cancellation, or when the browser is closed.
    """
    start = time.monotonic()
    while True:
        if should_stop and should_stop():
            raise LoginError("login cancelled")
        try:
            cookies = get_cookies()
        except Exception as exc:
            raise LoginError(f"the browser was closed before login finished ({exc})") from None
        names = {c.get("name") for c in cookies if c.get("value")}
        if all(n in names for n in REQUIRED_COOKIES):
            return [c for c in cookies if "tiktok" in str(c.get("domain", ""))]
        if timeout is not None and time.monotonic() - start > timeout:
            raise LoginError(f"timed out after {int(timeout)}s waiting for TikTok login")
        sleep(poll_interval)


def open_login_session(
    *,
    proxy: "str | Proxy | None" = None,
    timeout: float | None = 600,
    should_stop: Optional[Callable[[], bool]] = None,
) -> tuple[list[dict], str]:
    """Open a browser for the user to log in. Returns ``(cookies, user_agent)``.

    Shared by the CLI and the Docker web app's virtual browser.
    """
    from playwright.sync_api import Error as PlaywrightError

    p = parse_proxy(proxy)
    with sync_playwright() as pw:
        browser = launch_chromium(pw, headless=False, proxy=p, args=["--start-maximized"])
        try:
            context = browser.new_context(no_viewport=True)
            page = context.new_page()
            try:
                page.goto(settings.TIKTOK_LOGIN_URL, wait_until="domcontentloaded", timeout=60_000)
                user_agent = page.evaluate("() => navigator.userAgent")
            except PlaywrightError as exc:
                hint = " (check the proxy)" if p else ""
                raise LoginError(f"could not open TikTok's login page{hint}: {exc.message}") from None

            def get_cookies() -> list[dict]:
                if page.is_closed():
                    raise RuntimeError("page closed")
                return context.cookies()

            cookies = wait_for_session_cookies(
                get_cookies,
                timeout=timeout,
                should_stop=should_stop,
                # Keep Playwright's event loop running while we wait.
                sleep=lambda s: page.wait_for_timeout(s * 1000),
            )
        finally:
            try:
                browser.close()
            except Exception:  # pragma: no cover
                pass
    return cookies, user_agent


def login_interactive(
    name: str,
    *,
    proxy: "str | Proxy | None" = None,
    timeout: float | None = 600,
    store: AccountStore | None = None,
) -> Account:
    """Log in through a browser window and save the session as ``name``."""
    validate_account_name(name)
    p = parse_proxy(proxy)
    cookies, user_agent = open_login_session(proxy=p, timeout=timeout)
    account = Account(name=name, cookies=cookies, user_agent=user_agent, proxy=p.url if p else None)
    (store or AccountStore()).save(account)
    log.info("Saved session for '%s'", name)
    return account


def import_session(
    name: str,
    session_id: str,
    *,
    datacenter: str | None = None,
    user_agent: str | None = None,
    proxy: "str | Proxy | None" = None,
    store: AccountStore | None = None,
) -> Account:
    """Save a ``sessionid`` copied from a browser's cookies (no browser needed)."""
    account = Account.from_session_id(
        name, session_id, datacenter=datacenter, user_agent=user_agent, proxy=proxy
    )
    (store or AccountStore()).save(account)
    return account
