"""TikTok request signing (``_signature`` and ``X-Bogus``).

TikTok's own obfuscated JavaScript computes the signatures, so it runs inside a
headless Chromium page on the ``www.tiktok.com`` origin. The browser never
touches the network itself: the page request is made by ``requests`` (through
the account's proxy, if any) so TikTok's cookies land in the browser, Chromium
is given a blank page on that origin, and every other request is blocked. No
Node.js needed.

A :class:`Signer` can be reused for many signatures; starting it costs about
two seconds. With a cloud browser (``AUTOTOK_BROWSER=browserbase`` or
``steel``) the page runs remotely; the page fetch and every other request still
go through the route handler, so TikTok traffic keeps using the account's proxy.
"""
from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from .browsers import open_browser, sync_playwright
from .errors import AutotokError, SigningError
from .proxy import Proxy, parse_proxy, proxied_session

log = logging.getLogger("autotok")

_JS_DIR = Path(__file__).parent / "signer_js"
_SCRIPTS = ("signer.js", "webmssdk.js", "xbogus.js")
PAGE_URL = "https://www.tiktok.com/api/v1/web/project/post/"
VERIFY_FP = "verify_5b161567bda98b6a50c0414d99909d4b"
_STUB_HTML = "<!doctype html><html><head></head><body></body></html>"
_READY = (
    "() => !!(window.byted_acrawler && typeof window.byted_acrawler.sign === 'function'"
    " && typeof window.generateBogus === 'function')"
)


@dataclass(frozen=True)
class Signature:
    signature: str
    x_bogus: str
    verify_fp: str
    signed_url: str


class Signer:
    def __init__(self, user_agent: str, *, proxy: "str | Proxy | None" = None, timeout: float = 30.0):
        self.user_agent = user_agent
        self.proxy = parse_proxy(proxy)
        self.timeout = timeout
        self._pw = None
        self._handle = None
        self._context = None
        self._page = None
        self._http = proxied_session(self.proxy)
        self._http.headers.update({"User-Agent": user_agent, "Accept": "text/html,application/json,*/*"})

    def __enter__(self) -> "Signer":
        self.start()
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def start(self) -> None:
        if self._page is not None:
            return
        try:
            self._pw = sync_playwright().start()
            # Locally, point the browser at a closed port: anything that slips
            # past the route handler (e.g. Chrome's preconnect) fails instead of
            # reaching TikTok from the real IP.
            self._handle = open_browser(self._pw, headless=True, offline=True,
                                        timeout=max(300, self.timeout * 4))
            if self._handle.is_remote:
                self._context = self._handle.context()
                page = self._handle.page(self._context)
            else:
                device = dict(self._pw.devices["iPhone 11 Pro"])
                device.pop("default_browser_type", None)
                device.update(
                    user_agent=self.user_agent,
                    locale="en-US",
                    device_scale_factor=random.randint(1, 3),
                    is_mobile=random.random() > 0.5,
                    has_touch=random.random() > 0.5,
                    viewport={"width": random.randint(320, 1920), "height": random.randint(320, 1920)},
                )
                self._context = self._handle.context(bypass_csp=True, **device)
                page = self._context.new_page()
            page.route("**/*", self._route)
            ms = self.timeout * 1000
            page.goto(PAGE_URL, wait_until="load", timeout=ms)
            for name in _SCRIPTS:
                page.add_script_tag(path=str(_JS_DIR / name))
            page.wait_for_function(_READY, timeout=ms)
            self._page = page
        except AutotokError:
            self.close()
            raise
        except Exception as exc:
            self.close()
            raise SigningError(f"could not start the signing browser: {exc}") from exc

    def _route(self, route) -> None:
        request = route.request
        if request.resource_type != "document":
            route.abort()
            return
        try:
            r = self._http.get(request.url, timeout=self.timeout)
            cookies = [
                {"name": c.name, "value": c.value, "domain": c.domain or ".tiktok.com",
                 "path": c.path or "/", "secure": bool(c.secure)}
                for c in r.cookies
            ]
            if cookies:
                self._context.add_cookies(cookies)
            route.fulfill(status=200, content_type="text/html", body=_STUB_HTML)
        except Exception as exc:
            # The signature code runs locally; a stub page on the right origin is enough.
            log.debug("signer page fetch failed (%s); using stub page", exc)
            route.fulfill(status=200, content_type="text/html", body=_STUB_HTML)

    def sign(self, url: str) -> Signature:
        if self._page is None:
            self.start()
        page = self._page
        try:
            sep = "&" if urlsplit(url).query else "?"
            url_fp = f"{url}{sep}verifyFp={VERIFY_FP}"
            token = page.evaluate("u => window.byted_acrawler.sign({url: u})", url_fp)
            signed = f"{url_fp}&_signature={token}"
            query = page.evaluate("u => new URL(u).searchParams.toString()", signed)
            bogus = page.evaluate("([q, ua]) => window.generateBogus(q, ua)", [query, self.user_agent])
        except Exception as exc:
            raise SigningError(f"signature generation failed: {exc}") from exc
        if not token or not bogus:
            raise SigningError("signature generation returned an empty value")
        return Signature(signature=token, x_bogus=bogus, verify_fp=VERIFY_FP,
                         signed_url=f"{signed}&X-Bogus={bogus}")

    def close(self) -> None:
        for obj, method in ((self._handle, "close"), (self._pw, "stop")):
            if obj is not None:
                try:
                    getattr(obj, method)()
                except Exception:  # pragma: no cover - best effort cleanup
                    pass
        self._page = self._context = self._handle = self._pw = None
        self._http.close()
