"""Proxy parsing and helpers.

One proxy is applied to everything autotok does for an account: the login
browser, the signature fetch and every upload request. That keeps TikTok seeing
a single IP per account.

Accepted formats (the scheme defaults to ``http``)::

    http://user:pass@host:port
    socks5://user:pass@host:port
    host:port
    user:pass@host:port
    host:port:user:pass          # the export format most proxy providers use
"""
from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import quote, unquote, urlsplit

from .errors import ValidationError

SUPPORTED_SCHEMES = ("http", "https", "socks5", "socks5h", "socks4")

# Used by ``check_proxy`` to report the exit IP.
IP_ECHO_URL = "https://api.ipify.org?format=json"


@dataclass(frozen=True)
class Proxy:
    scheme: str
    host: str
    port: int
    username: str | None = None
    password: str | None = field(default=None, repr=False)

    @classmethod
    def parse(cls, value: str) -> "Proxy":
        raw = (value or "").strip()
        if not raw:
            raise ValidationError("proxy is empty")

        if "://" not in raw:
            parts = raw.split(":")
            # host:port:user:pass (no '@'). Passwords containing ':' are kept intact.
            if "@" not in raw and len(parts) >= 4:
                host, port, user = parts[0], parts[1], parts[2]
                password = ":".join(parts[3:])
                return cls._build("http", host, port, user, password, raw)
            raw = "http://" + raw

        try:
            parsed = urlsplit(raw)
            port = parsed.port
        except ValueError as exc:
            raise ValidationError(f"invalid proxy '{_mask_raw(value)}': {exc}") from None
        return cls._build(
            (parsed.scheme or "http").lower(),
            parsed.hostname or "",
            port,
            unquote(parsed.username) if parsed.username else None,
            unquote(parsed.password) if parsed.password else None,
            value,
        )

    @classmethod
    def _build(cls, scheme, host, port, username, password, original) -> "Proxy":
        if scheme not in SUPPORTED_SCHEMES:
            raise ValidationError(
                f"unsupported proxy scheme '{scheme}' (use one of: {', '.join(SUPPORTED_SCHEMES)})"
            )
        if not host:
            raise ValidationError(f"invalid proxy '{_mask_raw(original)}': missing host")
        try:
            port = int(port)
        except (TypeError, ValueError):
            raise ValidationError(f"invalid proxy '{_mask_raw(original)}': missing or bad port") from None
        if not 0 < port < 65536:
            raise ValidationError(f"invalid proxy '{_mask_raw(original)}': port out of range")
        return cls(scheme, host, port, username or None, password or None)

    @property
    def url(self) -> str:
        """Full URL including credentials, e.g. ``http://user:pass@host:8080``."""
        return f"{self.scheme}://{self._auth(mask=False)}{self._hostport}"

    def masked(self) -> str:
        """URL safe for logs and UIs: the password is replaced with ``****``."""
        return f"{self.scheme}://{self._auth(mask=True)}{self._hostport}"

    def __str__(self) -> str:  # never leak the password by accident
        return self.masked()

    def for_requests(self) -> dict[str, str]:
        url = self.url
        if self.scheme == "socks5":
            # Resolve DNS through the proxy too, otherwise lookups leak the real IP.
            url = "socks5h://" + url[len("socks5://"):]
        return {"http": url, "https": url}

    def for_playwright(self) -> dict[str, str]:
        if self.scheme.startswith("socks") and self.username:
            raise ValidationError(
                "Chromium cannot use SOCKS proxies that need a username/password. "
                "Use the provider's HTTP endpoint for this account instead."
            )
        scheme = "socks5" if self.scheme == "socks5h" else self.scheme
        out = {"server": f"{scheme}://{self._hostport}"}
        if self.username:
            out["username"] = self.username
            out["password"] = self.password or ""
        return out

    @property
    def _hostport(self) -> str:
        host = f"[{self.host}]" if ":" in self.host else self.host
        return f"{host}:{self.port}"

    def _auth(self, *, mask: bool) -> str:
        if not self.username:
            return ""
        user = quote(self.username, safe="")
        if self.password is None:
            return f"{user}@"
        password = "****" if mask else quote(self.password, safe="")
        return f"{user}:{password}@"


def parse_proxy(value: "str | Proxy | None") -> Proxy | None:
    """Return a :class:`Proxy`, or ``None`` for empty values."""
    if value is None or isinstance(value, Proxy):
        return value
    if not str(value).strip():
        return None
    return Proxy.parse(str(value))


def proxied_session(proxy: "str | Proxy | None"):
    """A ``requests.Session`` that always uses ``proxy``.

    ``requests`` lets ``HTTP(S)_PROXY`` environment variables override
    ``Session.proxies``, which would silently send every account through the
    same machine-wide proxy. Passing the proxy on each request prevents that.
    """
    import requests

    p = parse_proxy(proxy)
    pinned = p.for_requests() if p else None

    class _ProxiedSession(requests.Session):
        def request(self, method, url, **kwargs):
            if pinned is not None and not kwargs.get("proxies"):
                kwargs["proxies"] = pinned
            return super().request(method, url, **kwargs)

    s = _ProxiedSession()
    if pinned:
        s.proxies.update(pinned)
    return s


def check_proxy(proxy: "str | Proxy | None", timeout: float = 15.0) -> str:
    """Make a request through ``proxy`` and return the public IP TikTok will see."""
    import requests

    from .errors import AutotokError

    p = parse_proxy(proxy)
    try:
        r = requests.get(IP_ECHO_URL, proxies=p.for_requests() if p else None, timeout=timeout)
        r.raise_for_status()
        return r.json()["ip"]
    except (requests.RequestException, ValueError, KeyError) as exc:
        label = p.masked() if p else "direct connection"
        raise AutotokError(f"proxy check failed for {label}: {exc}") from None


def _mask_raw(value: str) -> str:
    """Best-effort masking for error messages about strings we failed to parse."""
    value = value or ""
    if "@" in value:
        creds, _, rest = value.rpartition("@")
        scheme, sep, userpass = creds.rpartition("://")
        user = userpass.split(":", 1)[0]
        return f"{scheme}{sep}{user}:****@{rest}"
    parts = value.split(":")
    if len(parts) >= 4:
        return ":".join(parts[:3] + ["****"])
    return value
