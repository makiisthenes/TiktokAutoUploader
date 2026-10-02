import pytest

from autotok.auth import wait_for_session_cookies
from autotok.errors import LoginError


def test_closing_the_browser_while_waiting_is_a_login_error():
    def closed(_):
        raise RuntimeError("Target page, context or browser has been closed")

    with pytest.raises(LoginError, match="closed"):
        wait_for_session_cookies(lambda: [], sleep=closed)


def test_cookie_read_failure_is_a_login_error():
    def boom():
        raise RuntimeError("closed")

    with pytest.raises(LoginError):
        wait_for_session_cookies(boom)


def test_returns_tiktok_cookies_once_logged_in():
    cookies = [{"name": "sessionid", "value": "s", "domain": ".tiktok.com"},
               {"name": "tt-target-idc", "value": "dc", "domain": ".tiktok.com"},
               {"name": "x", "value": "1", "domain": ".example.com"}]
    assert [c["name"] for c in wait_for_session_cookies(lambda: cookies)] == ["sessionid", "tt-target-idc"]


def test_cloud_login_closes_popups_and_refocuses(caplog, monkeypatch):
    import logging

    from autotok.auth import _keep_login_tab_in_front

    class Page:
        def __init__(self, name):
            self.name, self.closed, self.fronted = name, False, False

        def is_closed(self):
            return self.closed

        def close(self):
            self.closed = True

        def bring_to_front(self):
            self.fronted = True

    login, popup = Page("login"), Page("google")

    class Context:
        pages = [login, popup]

    monkeypatch.setattr(logging.getLogger("autotok"), "propagate", True)
    with caplog.at_level("WARNING", logger="autotok"):
        _keep_login_tab_in_front(Context(), login)
    assert popup.closed and not login.closed and login.fronted
    assert "QR code" in caplog.text

    caplog.clear()
    Context.pages = [login]
    login.fronted = False
    _keep_login_tab_in_front(Context(), login)
    assert not login.fronted and not caplog.text  # nothing to do, no noise


def test_cancel():
    with pytest.raises(LoginError, match="cancelled"):
        wait_for_session_cookies(lambda: [], should_stop=lambda: True)
