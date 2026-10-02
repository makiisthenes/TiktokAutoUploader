"""Small helpers shared by the cloud providers."""
from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

import requests

# Hosts a server reports when it doesn't know its public address.
_UNROUTABLE_HOSTS = {"0.0.0.0", "::", ""}


def error_detail(r: requests.Response) -> str:
    """Short error text from an API response, for messages."""
    try:
        data = r.json()
        if isinstance(data, dict):
            return str(data.get("message") or data.get("error") or data)[:300]
        return str(data)[:300]
    except ValueError:
        return r.text[:300]


def add_query(url: str, query: str) -> str:
    """Append ``query`` (``a=1&b=2``) to ``url``."""
    return f"{url}{'&' if '?' in url else '?'}{query}"


def reachable(url: str, base_url: str) -> str:
    """Point ``url`` at ``base_url``'s host when the server reported an
    unroutable address such as ``0.0.0.0`` (self-hosted defaults)."""
    parts = urlsplit(url)
    if (parts.hostname or "") not in _UNROUTABLE_HOSTS:
        return url
    base = urlsplit(base_url)
    scheme = parts.scheme
    if scheme in ("ws", "wss"):
        scheme = "wss" if base.scheme == "https" else "ws"
    elif scheme in ("http", "https"):
        scheme = base.scheme
    return urlunsplit((scheme, base.netloc, parts.path, parts.query, parts.fragment))
