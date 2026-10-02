"""The browser provider interface.

A :class:`BrowserProvider` starts a browser and returns a :class:`BrowserHandle`.
:class:`CloudProvider` covers services that hand out a remote Chromium over
CDP (Browserbase, Steel): subclasses only implement :meth:`create_session`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from ..errors import RemoteBrowserError
from ..proxy import Proxy


class CloudSession(ABC):
    """A remote browser session."""

    id: str
    connect_url: str  # CDP endpoint for Playwright's connect_over_cdp

    @abstractmethod
    def live_view_url(self) -> str:
        """Link that lets a person watch and control the browser."""

    @abstractmethod
    def release(self) -> None:
        """End the session now (stops billing). Must not raise."""


class BrowserHandle:
    """A running browser: local Chromium, or a cloud session."""

    def __init__(self, browser, *, session: CloudSession | None = None, provider: str = "local"):
        self.browser = browser
        self.session = session
        self.provider = provider

    @property
    def is_remote(self) -> bool:
        return self.session is not None

    def context(self, **options):
        """A browser context to work in. Cloud sessions come with one
        preconfigured context (fingerprint, proxy), so ``options`` only apply
        to local browsers."""
        if self.is_remote:
            return self.browser.contexts[0] if self.browser.contexts else self.browser.new_context()
        return self.browser.new_context(**options)

    @staticmethod
    def page(context):
        """The context's first page (cloud sessions open with one), or a new one."""
        return context.pages[0] if context.pages else context.new_page()

    def live_view_url(self) -> str | None:
        return self.session.live_view_url() if self.session is not None else None

    def close(self) -> None:
        try:
            self.browser.close()
        except Exception:  # pragma: no cover - best effort cleanup
            pass
        if self.session is not None:
            self.session.release()

    def __enter__(self) -> "BrowserHandle":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


class BrowserProvider(ABC):
    """Starts browsers for login and signing."""

    #: Human-readable name used in messages.
    label: str = "browser"

    @abstractmethod
    def open(self, pw, *, headless: bool = True, proxy: Proxy | None = None,
             args: list[str] | None = None, offline: bool = False,
             timeout: float | None = None) -> BrowserHandle:
        """Start a browser.

        ``proxy`` routes its traffic through the account's proxy. ``offline``
        browsers only run page scripts (every request is fulfilled by a route
        handler), so they need no proxy. ``timeout`` (seconds) bounds how long
        a cloud session may live.
        """


class CloudProvider(BrowserProvider):
    """A provider that hands out remote Chromium sessions over CDP."""

    @abstractmethod
    def create_session(self, *, proxy: Proxy | None = None, timeout: float | None = None) -> CloudSession:
        """Start a remote session (its traffic goes through ``proxy`` if given)."""

    def open(self, pw, *, headless: bool = True, proxy: Proxy | None = None,
             args: list[str] | None = None, offline: bool = False,
             timeout: float | None = None) -> BrowserHandle:
        session = self.create_session(proxy=None if offline else proxy, timeout=timeout)
        try:
            browser = pw.chromium.connect_over_cdp(session.connect_url)
        except Exception as exc:
            session.release()
            raise RemoteBrowserError(f"could not connect to the {self.label} session: {exc}") from None
        return BrowserHandle(browser, session=session, provider=self.label)
