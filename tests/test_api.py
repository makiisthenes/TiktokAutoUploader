from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

import api.db as api_db
from api.services.tiktok_adapter import UploadOutcome


@pytest.fixture
def engine(tmp_path):
    eng = api_db.make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    old = api_db.engine
    api_db.override_engine(eng)
    api_db.init_db()
    yield eng
    api_db.override_engine(old)
    SQLModel.metadata.drop_all(eng)


@pytest.fixture
def client(engine):
    from api.main import create_app

    with TestClient(create_app(), base_url="http://localhost", headers={"X-Requested-With": "autotok"}) as c:
        yield c


@pytest.fixture
def uploads(monkeypatch):
    calls = []

    def fake(username, video_path, title, options):
        calls.append((username, video_path, title, options))
        return UploadOutcome(ok=True, message="published", video_id="v1")

    monkeypatch.setattr("api.services.tiktok_adapter.upload_from_options", fake)
    return calls


def _import(client):
    r = client.post("/api/accounts/import-from-disk")
    assert r.status_code == 200
    return r.json()


def test_import_and_masked_proxy(client, saved_account):
    accounts = _import(client)
    assert [a["username"] for a in accounts] == ["alice"]
    assert accounts[0]["proxy"] == "http://bob:****@proxy.example:8000"


def test_update_proxy(client, saved_account):
    acct = _import(client)[0]
    r = client.patch(f"/api/accounts/{acct['id']}", json={"proxy": "socks5://h.example:1080"})
    assert r.status_code == 200 and r.json()["proxy"] == "socks5://h.example:1080"
    r = client.patch(f"/api/accounts/{acct['id']}", json={"proxy": "not a proxy"})
    assert r.status_code == 422
    r = client.patch(f"/api/accounts/{acct['id']}", json={"proxy": ""})
    assert r.json()["proxy"] is None


def test_proxy_providers_endpoint(client, monkeypatch):
    from autotok import proxy_providers
    from autotok.proxy_providers import ProxyProvider

    assert client.get("/api/proxy/providers").json() == []
    monkeypatch.setattr(proxy_providers, "PROVIDERS", (
        ProxyProvider(key="other", name="Other", tagline="t", signup_url="https://other.example"),
        ProxyProvider(key="acme", name="Acme", tagline="t", signup_url="https://acme.example",
                      steps=("Sign up.",), sponsor=True),
    ))
    data = client.get("/api/proxy/providers").json()
    assert [p["key"] for p in data] == ["acme", "other"]
    assert data[0]["steps"] == ["Sign up."] and data[0]["proxy_format"] == "host:port:user:pass"


def test_proxy_test_endpoint(client, saved_account, monkeypatch):
    acct = _import(client)[0]
    monkeypatch.setattr("api.routers.proxy.check_proxy", lambda p: "198.51.100.1")
    r = client.post("/api/proxy/test", json={"account_id": acct["id"]})
    assert r.json() == {"ok": True, "proxy": "http://bob:****@proxy.example:8000",
                        "ip": "198.51.100.1", "error": None}


def test_file_upload_streams_and_reports_video_id(client, saved_account, uploads):
    _import(client)
    big = b"0" * (3 * 1024 * 1024)
    r = client.post("/api/uploads/file", data={"username": "alice", "title": "hi",
                    "options_json": '{"visibility_type": 1, "allow_duet": 1}'},
                    files={"video": ("clip.mp4", big, "video/mp4")})
    assert r.status_code == 200 and r.json() == {"ok": True, "message": "published", "video_id": "v1"}
    (_, path, _, options) = uploads[0]
    assert options["visibility_type"] == 1 and options["allow_duet"] == 1
    assert path.endswith(".mp4")


def test_library_upload_and_schedule_validation(client, saved_account, uploads, video_file):
    _import(client)
    assert [v["name"] for v in client.get("/api/videos").json()] == ["clip.mp4"]
    r = client.post("/api/uploads/library", json={"username": "alice", "title": "t", "name": "clip.mp4"})
    assert r.json()["ok"] is True
    when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    ok = client.post("/api/schedules", json={"username": "alice", "title": "t", "source_type": "local",
                                             "source_ref": "clip.mp4", "scheduled_for": when})
    assert ok.status_code == 201 and ok.json()["source_ref"] == "clip.mp4"
    for bad in ("/etc/passwd", "../work/x.mp4", "missing.mp4"):
        r = client.post("/api/schedules", json={"username": "alice", "title": "t", "source_type": "local",
                                                "source_ref": bad, "scheduled_for": when})
        assert r.status_code == 400, bad


def test_video_library_add_and_delete(client):
    r = client.post("/api/videos", files={"video": ("my clip!.mp4", b"abc", "video/mp4")})
    assert r.status_code == 201 and r.json()["name"] == "my clip_.mp4"
    r2 = client.post("/api/videos", files={"video": ("my clip!.mp4", b"abc", "video/mp4")})
    assert r2.json()["name"] == "my clip_-2.mp4"
    assert client.post("/api/videos", files={"video": ("x.exe", b"a", "x")}).status_code == 415
    assert client.delete("/api/videos/my clip_.mp4").status_code == 204
    assert client.delete("/api/videos/..%2F..%2Fetc").status_code in (404, 405)


def test_login_callback_requires_token(client, monkeypatch):
    from api.routers import login as login_router

    monkeypatch.setattr("api.services.novnc_client.start_browser", lambda *a, **k: {})
    monkeypatch.setattr("api.services.novnc_client.stop_browser", lambda *a, **k: None)
    sid = client.post("/api/login/browser/start", json={"username": "carol",
                                                        "proxy": "h.example:8000"}).json()["session_id"]
    cookies = [{"name": "sessionid", "value": "abc"}, {"name": "tt-target-idc", "value": "dc"}]
    url = f"/api/login/browser/{sid}/complete"
    assert client.post(url, json={"cookies": cookies}).status_code == 403
    r = client.post(url + f"?token={login_router.callback_token(sid)}",
                    json={"cookies": cookies, "user_agent": "UA", "proxy": "http://h.example:8000"})
    assert r.status_code == 200 and r.json()["status"] == "completed"
    accounts = client.get("/api/accounts").json()
    assert accounts[0]["username"] == "carol" and accounts[0]["proxy"] == "http://h.example:8000"
    from autotok import AccountStore
    assert AccountStore().load("carol").user_agent == "UA"


def test_session_check_only_invalidates_on_rejection(client, saved_account, monkeypatch):
    from autotok.errors import NotLoggedInError, UploadError

    acct = _import(client)[0]

    def network_down(self):
        raise UploadError("session check: network error: proxy refused")

    monkeypatch.setattr("autotok.Client.check_session", network_down)
    r = client.post(f"/api/accounts/{acct['id']}/check")
    assert r.status_code == 502
    assert client.get(f"/api/accounts/{acct['id']}").json()["has_valid_session"] is True

    def rejected(self):
        raise NotLoggedInError("rejected")

    monkeypatch.setattr("autotok.Client.check_session", rejected)
    assert client.post(f"/api/accounts/{acct['id']}/check").json() == {"valid": False}
    assert client.get(f"/api/accounts/{acct['id']}").json()["has_valid_session"] is False


def test_corrupt_account_file_does_not_break_listing(client, saved_account, autotok_home):
    _import(client)
    (autotok_home / "accounts" / "alice.json").write_text("{not json")
    r = client.get("/api/accounts")
    assert r.status_code == 200 and r.json()[0]["proxy"] is None


def test_failure_reason_is_sent_before_terminal_status(client, monkeypatch):
    monkeypatch.setattr("api.services.novnc_client.start_browser", lambda *a, **k: {})
    sid = client.post("/api/login/browser/start", json={"username": "dave"}).json()["session_id"]
    from sqlmodel import Session

    from api.models import LoginSession
    with Session(api_db.engine) as s:
        row = s.get(LoginSession, sid)
        row.status, row.error = "failed", "timed out waiting for TikTok login"
        s.add(row)
        s.commit()
    body = client.get(f"/api/login/browser/{sid}/events").text
    assert body.index("event: failure") < body.index("event: status")
    assert "timed out waiting for TikTok login" in body


def test_callback_secret_is_persisted(monkeypatch, autotok_home):
    from api.routers import login as login_router

    monkeypatch.delenv("AUTOTOK_CALLBACK_SECRET", raising=False)
    monkeypatch.setattr(login_router, "_secret", None)
    token = login_router.callback_token("abc")
    assert (autotok_home / ".callback_secret").is_file()
    monkeypatch.setattr(login_router, "_secret", None)  # simulate an API restart
    assert login_router.callback_token("abc") == token


def test_state_changing_requests_need_csrf_header(engine, saved_account):
    from api.main import create_app

    with TestClient(create_app(), base_url="http://localhost") as bare:
        assert bare.post("/api/accounts/import-from-disk").status_code == 403
        assert bare.get("/api/accounts").status_code == 200  # reads are fine
        r = bare.get("/api/accounts", headers={"Origin": "https://evil.example"})
        assert "access-control-allow-origin" not in r.headers


def test_schedules_never_return_proxy_password(client, saved_account, video_file):
    _import(client)
    when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    r = client.post("/api/schedules", json={
        "username": "alice", "title": "t", "source_type": "local", "source_ref": "clip.mp4",
        "scheduled_for": when, "options": {"proxy": "http://carol:topsecret@h.example:8000"}})
    assert r.status_code == 201
    assert "topsecret" not in r.text and "carol:****@h.example" in r.json()["options_json"]
    assert "topsecret" not in client.get("/api/schedules").text
    from sqlmodel import Session

    from api.models import ScheduledUpload
    with Session(api_db.engine) as s:  # the real value is kept for the scheduler
        assert "topsecret" in s.get(ScheduledUpload, r.json()["id"]).options_json


def test_delete_account_with_schedules(client, saved_account, video_file):
    acct = _import(client)[0]
    when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    sched = client.post("/api/schedules", json={"username": "alice", "title": "t", "source_type": "local",
                                                "source_ref": "clip.mp4", "scheduled_for": when}).json()
    assert client.delete(f"/api/accounts/{acct['id']}").status_code == 409
    client.patch(f"/api/schedules/{sched['id']}", json={"status": "cancelled"})
    assert client.delete(f"/api/accounts/{acct['id']}").status_code == 204
    assert client.get("/api/schedules").json() == []


def test_new_login_replaces_abandoned_one(client, monkeypatch):
    stopped = []
    monkeypatch.setattr("api.services.novnc_client.start_browser", lambda *a, **k: {})
    monkeypatch.setattr("api.services.novnc_client.stop_browser", stopped.append)
    first = client.post("/api/login/browser/start", json={"username": "a"}).json()["session_id"]
    second = client.post("/api/login/browser/start", json={"username": "b"}).json()["session_id"]
    assert stopped == [first]
    assert client.get(f"/api/login/browser/{first}").json()["status"] == "expired"
    assert client.get(f"/api/login/browser/{second}").json()["status"] == "active"


def test_unknown_login_session_stream(client):
    body = client.get("/api/login/browser/nope/events").text
    assert "event: error" not in body
    assert body.index("event: failure") < body.index("event: status")


def _failed_schedule(client, engine, *, uncertain):
    from sqlmodel import Session

    from api.models import ScheduledUpload

    _import(client)
    when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    sid = client.post("/api/schedules", json={"username": "alice", "title": "t", "source_type": "local",
                                              "source_ref": "clip.mp4", "scheduled_for": when}).json()["id"]
    with Session(engine) as s:
        row = s.get(ScheduledUpload, sid)
        row.status = "failed"
        row.publish_uncertain = uncertain
        row.result_text = "publish request failed; the video may or may not have been posted."
        s.add(row)
        s.commit()
    return sid


def test_retrying_a_maybe_posted_job_needs_confirmation(client, engine, saved_account, video_file):
    sid = _failed_schedule(client, engine, uncertain=True)
    assert client.get(f"/api/schedules/{sid}").json()["publish_uncertain"] is True
    r = client.patch(f"/api/schedules/{sid}", json={"status": "pending"})
    assert r.status_code == 409 and "may already be on TikTok" in r.json()["detail"]
    assert client.get(f"/api/schedules/{sid}").json()["status"] == "failed"

    r = client.patch(f"/api/schedules/{sid}", json={"status": "pending", "confirm_uncertain": True})
    assert r.status_code == 200
    assert r.json()["status"] == "pending" and r.json()["publish_uncertain"] is False


def test_retrying_a_definite_failure_needs_no_confirmation(client, engine, saved_account, video_file):
    sid = _failed_schedule(client, engine, uncertain=False)
    r = client.patch(f"/api/schedules/{sid}", json={"status": "pending"})
    assert r.status_code == 200 and r.json()["status"] == "pending"


def test_edits_never_overwrite_a_job_the_scheduler_just_claimed(client, engine, saved_account, video_file):
    from fastapi import HTTPException
    from sqlmodel import Session

    from api.models import ScheduledUpload
    from api.routers import schedules
    from api.schemas import ScheduledUploadUpdate

    _import(client)
    when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    sid = client.post("/api/schedules", json={"username": "alice", "title": "t", "source_type": "local",
                                              "source_ref": "clip.mp4", "scheduled_for": when}).json()["id"]
    with Session(engine) as stale, Session(engine) as worker_side:
        assert stale.get(ScheduledUpload, sid).status == "pending"  # the API reads the row...
        claimed = worker_side.get(ScheduledUpload, sid)  # ...then the scheduler claims it
        claimed.status = "running"
        worker_side.add(claimed)
        worker_side.commit()
        with pytest.raises(HTTPException) as cancel:
            schedules.update_schedule(sid, ScheduledUploadUpdate(status="cancelled"), stale)
        assert cancel.value.status_code == 409
        with pytest.raises(HTTPException) as remove:
            schedules.delete_schedule(sid, stale)
        assert remove.value.status_code == 409
    assert client.get(f"/api/schedules/{sid}").json()["status"] == "running"


def test_requests_for_other_host_names_are_refused(engine, saved_account, monkeypatch):
    # A DNS-rebinding page is "same origin" to the browser and can send the CSRF header, but its
    # Host header names its own domain.
    from api.main import create_app

    with TestClient(create_app(), base_url="http://localhost") as c:
        for host in ("localhost:3000", "127.0.0.1:8000", "[::1]:8000", "api:8000", "LOCALHOST"):
            assert c.get("/api/accounts", headers={"Host": host}).status_code == 200, host
        for host in ("evil.example", "evil.example:3000", "localhost.evil.example", "", "[::1]evil.example"):
            r = c.post("/api/accounts/import-from-disk",
                       headers={"Host": host, "X-Requested-With": "autotok"})
            assert r.status_code == 403, host
        monkeypatch.setenv("AUTOTOK_ALLOWED_HOSTS", "tiktok.home.lan, other.lan")
        assert c.get("/api/accounts", headers={"Host": "tiktok.home.lan:3000"}).status_code == 200


def test_vnc_websocket_only_for_the_app_during_a_login(client, engine):
    from sqlmodel import Session

    from api.models import LoginSession

    def check(origin=None, host="localhost:3000"):
        headers = {"Host": host}
        if origin:
            headers["Origin"] = origin
        return client.get("/api/login/browser/vnc-auth", headers=headers).status_code

    assert check("http://localhost:3000") == 403  # no login in progress
    with Session(engine) as s:
        s.add(LoginSession(id="s1", username="alice", status="active"))
        s.commit()
    assert check("http://localhost:3000") == 204
    assert check("http://127.0.0.1:3000", host="127.0.0.1:3000") == 204
    assert check() == 403  # browsers always send Origin on websockets
    assert check("https://evil.example") == 403
    assert check("http://localhost:9999") == 403  # another app on this machine
    assert check("http://127.0.0.1:3000") == 403  # a different origin from the app's
    assert check("null") == 403
