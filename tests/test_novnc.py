import threading
import time

import pytest
from fastapi.testclient import TestClient

from autotok.errors import LoginError
from novnc import control_server as cs


@pytest.fixture
def client(monkeypatch):
    cs._state = cs._BrowserState()
    posted = []

    class FakeHttp:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def post(self, url, json, headers=None):
            assert headers == {"X-Requested-With": "autotok"}
            posted.append((url, json))

            class R:
                def raise_for_status(self):
                    pass

            return R()

    monkeypatch.setattr(cs.httpx, "Client", FakeHttp)
    c = TestClient(cs.app)
    c.posted = posted
    return c


def _wait_for(client, sid, status, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = client.get(f"/browser/status/{sid}")
        if r.status_code == 200 and r.json()["status"] == status:
            return r.json()
        time.sleep(0.02)
    raise AssertionError(f"never reached {status}: {r.json()}")


def test_login_posts_cookies_ua_and_proxy(client, monkeypatch):
    seen = {}

    def fake_open(*, proxy, timeout, should_stop):
        seen["proxy"] = proxy
        return [{"name": "sessionid", "value": "s"}], "UA/2"

    monkeypatch.setattr(cs, "open_login_session", fake_open)
    r = client.post("/browser/start", json={"session_id": "a", "username": "u",
                                            "callback_url": "http://api/cb?token=t",
                                            "proxy": "http://p.example:1"})
    assert r.status_code == 202
    _wait_for(client, "a", "completed")
    assert seen["proxy"] == "http://p.example:1"
    assert client.posted == [("http://api/cb?token=t", {"cookies": [{"name": "sessionid", "value": "s"}],
                                                        "user_agent": "UA/2", "proxy": "http://p.example:1"})]


def test_one_login_at_a_time_and_cancel(client, monkeypatch):
    started = threading.Event()

    def blocking_open(*, proxy, timeout, should_stop):
        started.set()
        while not should_stop():
            time.sleep(0.01)
        raise LoginError("login cancelled")

    monkeypatch.setattr(cs, "open_login_session", blocking_open)
    client.post("/browser/start", json={"session_id": "a", "username": "u", "callback_url": "x"})
    assert started.wait(5)
    busy = client.post("/browser/start", json={"session_id": "b", "username": "u", "callback_url": "x"})
    assert busy.status_code == 409
    assert client.delete("/browser/a").status_code == 204
    assert client.get("/browser/status/a").status_code == 404
    # a new login can start right away
    monkeypatch.setattr(cs, "open_login_session", lambda **k: ([{"name": "sessionid", "value": "s"}], "UA"))
    assert client.post("/browser/start", json={"session_id": "c", "username": "u",
                                               "callback_url": "x"}).status_code == 202
    _wait_for(client, "c", "completed")


def test_failure_is_reported(client, monkeypatch):
    def failing_open(**k):
        raise LoginError("timed out after 600s waiting for TikTok login")

    monkeypatch.setattr(cs, "open_login_session", failing_open)
    client.post("/browser/start", json={"session_id": "a", "username": "u", "callback_url": "x"})
    body = _wait_for(client, "a", "failed")
    assert "timed out" in body["error"] and not client.posted
