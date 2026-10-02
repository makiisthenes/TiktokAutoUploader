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


def test_cancel():
    with pytest.raises(LoginError, match="cancelled"):
        wait_for_session_cookies(lambda: [], should_stop=lambda: True)
