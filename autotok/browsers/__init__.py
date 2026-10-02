"""Where login and signing browsers run.

A small factory picks the :class:`BrowserProvider` named by ``AUTOTOK_BROWSER``:

* ``local``: Chromium on this machine (default)
* ``browserbase``: Browserbase cloud browsers (``BROWSERBASE_API_KEY``)
* ``steel``: Steel Cloud, or a self-hosted steel-browser server (``STEEL_BASE_URL``)

Add your own with :func:`register_provider`::

    from autotok.browsers import CloudProvider, register_provider

    class MyProvider(CloudProvider):
        label = "My cloud"
        def create_session(self, *, proxy=None, timeout=None): ...

    register_provider("mycloud", MyProvider)   # then AUTOTOK_BROWSER=mycloud
"""
from __future__ import annotations

from typing import Callable

from .. import settings
from ..errors import ConfigurationError, MissingDependencyError
from ..proxy import Proxy
from .base import BrowserHandle, BrowserProvider, CloudProvider, CloudSession
from .browserbase import BrowserbaseProvider
from .local import LocalProvider, install_browser, launch_chromium
from .steel import SteelProvider

_REGISTRY: dict[str, Callable[[], BrowserProvider]] = {
    "local": LocalProvider,
    "browserbase": BrowserbaseProvider,
    "steel": SteelProvider,
}


def register_provider(name: str, factory: Callable[[], BrowserProvider]) -> None:
    """Make ``factory`` available as ``AUTOTOK_BROWSER=<name>``."""
    _REGISTRY[name.strip().lower()] = factory


def available_providers() -> list[str]:
    return sorted(_REGISTRY)


def get_provider(name: str | None = None) -> BrowserProvider:
    """The provider called ``name``, or the one ``AUTOTOK_BROWSER`` selects."""
    key = (name or settings.browser_provider()).strip().lower()
    try:
        factory = _REGISTRY[key]
    except KeyError:
        raise ConfigurationError(
            f"unknown browser provider {key!r}; use one of: {', '.join(available_providers())}"
        ) from None
    return factory()


def open_browser(pw, *, headless: bool = True, proxy: Proxy | None = None,
                 args: list[str] | None = None, offline: bool = False,
                 timeout: float | None = None, provider: str | None = None) -> BrowserHandle:
    """Start a browser from the selected provider (see :meth:`BrowserProvider.open`)."""
    return get_provider(provider).open(pw, headless=headless, proxy=proxy, args=args,
                                       offline=offline, timeout=timeout)


def sync_playwright():
    try:
        from playwright.sync_api import sync_playwright as _sp
    except ImportError as exc:  # pragma: no cover - playwright is a core dependency
        raise MissingDependencyError("playwright is not installed: pip install autotok") from exc
    return _sp()


__all__ = [
    "BrowserHandle",
    "BrowserProvider",
    "CloudProvider",
    "CloudSession",
    "BrowserbaseProvider",
    "LocalProvider",
    "SteelProvider",
    "available_providers",
    "get_provider",
    "install_browser",
    "launch_chromium",
    "open_browser",
    "register_provider",
    "sync_playwright",
]
