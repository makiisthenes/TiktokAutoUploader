import pytest

from autotok.errors import ValidationError
from autotok.proxy import Proxy, parse_proxy


@pytest.mark.parametrize("raw, url", [
    ("host.example:8000", "http://host.example:8000"),
    ("http://host.example:8000", "http://host.example:8000"),
    ("user:pass@host.example:8000", "http://user:pass@host.example:8000"),
    ("host.example:8000:user:pass", "http://user:pass@host.example:8000"),
    ("host.example:8000:user:pa:ss", "http://user:pa%3Ass@host.example:8000"),
    ("socks5://u:p@10.0.0.1:1080", "socks5://u:p@10.0.0.1:1080"),
    ("https://u:p%40w@h.example:443", "https://u:p%40w@h.example:443"),
])
def test_parse_formats(raw, url):
    assert Proxy.parse(raw).url == url


def test_masked_hides_password():
    p = Proxy.parse("http://user:topsecret@h.example:8000")
    assert p.masked() == "http://user:****@h.example:8000"
    assert "topsecret" not in str(p)
    assert "topsecret" not in repr(p.masked())


def test_repr_hides_password():
    p = Proxy.parse("http://user:topsecret@h.example:8000")
    assert "topsecret" not in repr(p) and "topsecret" not in f"{p!r} {p}"


def test_proxied_session_pins_proxy(monkeypatch):
    from autotok.proxy import proxied_session

    monkeypatch.setenv("HTTPS_PROXY", "http://env.example:1")
    s = proxied_session("http://acct.example:2")
    seen = {}

    def fake_send(request, **kwargs):
        seen.update(kwargs)
        raise RuntimeError("stop")

    monkeypatch.setattr(s, "send", fake_send)
    try:
        s.get("https://www.tiktok.com/")
    except RuntimeError:
        pass
    assert seen["proxies"]["https"] == "http://acct.example:2"


def test_requests_and_playwright_forms():
    p = Proxy.parse("socks5://h.example:1080")
    assert p.for_requests()["https"] == "socks5h://h.example:1080"  # DNS through the proxy
    assert p.for_playwright() == {"server": "socks5://h.example:1080"}
    http = Proxy.parse("http://u:p@h.example:8000")
    assert http.for_playwright() == {"server": "http://h.example:8000", "username": "u", "password": "p"}


def test_socks_auth_not_supported_by_chromium():
    with pytest.raises(ValidationError):
        Proxy.parse("socks5://u:p@h.example:1080").for_playwright()


@pytest.mark.parametrize("bad", ["", "ftp://h:1", "h.example", "h.example:99999", "http://:80"])
def test_invalid(bad):
    with pytest.raises(ValidationError):
        Proxy.parse(bad)


def test_parse_proxy_empty_is_none():
    assert parse_proxy(None) is None
    assert parse_proxy("  ") is None
