import json
import time
from datetime import datetime, timedelta, timezone

import pytest
import requests
import responses
from responses import matchers

from autotok import Account, Client, upload_video
from autotok import uploader as uploader_mod
from autotok.errors import (
    NotLoggedInError,
    PublishError,
    PublishUncertainError,
    UploadError,
    ValidationError,
)
from autotok.signer import Signature

TT = "https://www.tiktok.com"
UPLOAD_HOST = "upload.example"


class FakeSigner:
    def __init__(self):
        self.urls = []

    def sign(self, url):
        self.urls.append(url)
        return Signature(signature="_sig", x_bogus="XBOGUS", verify_fp="fp", signed_url=url)


def mock_tiktok(rsps, *, publish=None, apply_status=200, auth_json=None):
    rsps.add(responses.POST, f"{TT}/api/v1/web/project/create/",
             json={"project": {"project_id": "p1"}},
             headers={"Set-Cookie": "msToken=MS123; Domain=.tiktok.com; Path=/"})
    rsps.add(responses.GET, f"{TT}/api/v1/video/upload/auth/",
             json=auth_json if auth_json is not None else {"video_token_v5": {
                 "access_key_id": "AK", "secret_acess_key": "SK", "session_token": "ST"}})
    rsps.add(responses.GET, f"{TT}/top/v1", status=apply_status, json={"Result": {"InnerUploadAddress": {
        "UploadNodes": [{"Vid": "v123", "UploadHost": UPLOAD_HOST, "SessionKey": "SKEY",
                         "StoreInfos": [{"StoreUri": "tos/abc", "Auth": "STOREAUTH"}]}]}}})
    rsps.add(responses.POST, f"https://{UPLOAD_HOST}/tos/abc", json={})
    rsps.add(responses.POST, f"{TT}/top/v1", json={})
    rsps.add(responses.HEAD, TT)
    rsps.add(responses.GET, f"{TT}/@bob", body='"userInfo":{"user":{"id":"777"')
    if publish is None:
        publish = {"json": {"status_code": 0, "status_msg": ""}}
    rsps.add(responses.POST, f"{TT}/tiktok/web/project/post/v1/", **publish)


def publish_call(rsps):
    calls = [c for c in rsps.calls if c.request.url.startswith(f"{TT}/tiktok/web/project/post/v1/")]
    assert len(calls) == 1
    return calls[0]


@pytest.fixture
def client(saved_account):
    return Client(saved_account, signer=FakeSigner())


@responses.activate
def test_upload_sends_requested_settings(client, video_file):
    mock_tiktok(responses)
    result = client.upload(
        video_file, "Hello #fyp @bob", visibility="private", allow_comment=False,
        allow_duet=True, allow_stitch=True, ai_label=True,
    )
    assert result.video_id == "v123" and result.scheduled_for is None
    assert bool(result) is True

    call = publish_call(responses)
    body = json.loads(call.request.body)
    feature = body["feature_common_info_list"][0]
    assert feature["privacy_setting_info"] == {
        "visibility_type": 1, "allow_duet": 1, "allow_stitch": 1, "allow_comment": 0}
    assert feature["aigc_info"] == {"aigc_label_type": 1}
    assert "schedule_time" not in feature
    info = body["single_post_req_list"][0]["single_post_feature_info"]
    assert info["text"] == "Hello #fyp @bob"
    assert info["markup_text"] == 'Hello <h id="0">#fyp</h> <m id="1">@bob</m>'
    assert [e["type"] for e in info["text_extra"]] == [1, 0]
    assert "msToken=MS123" in call.request.url and "X-Bogus=XBOGUS" in call.request.url
    assert call.request.headers["user-agent"] == "UA/1.0"
    assert client._signer.urls[0].startswith(f"{TT}/api/v1/web/project/post/?")


@responses.activate
def test_defaults_are_public_without_ai_label(client, video_file):
    mock_tiktok(responses)
    client.upload(video_file, "plain caption")
    feature = json.loads(publish_call(responses).request.body)["feature_common_info_list"][0]
    assert feature["privacy_setting_info"] == {
        "visibility_type": 0, "allow_duet": 0, "allow_stitch": 0, "allow_comment": 1}
    assert "aigc_info" not in feature


@responses.activate
def test_schedule_sets_absolute_timestamp(client, video_file):
    mock_tiktok(responses)
    before = int(time.time())
    result = client.upload(video_file, "later", schedule=3600)
    feature = json.loads(publish_call(responses).request.body)["feature_common_info_list"][0]
    assert before + 3600 <= feature["schedule_time"] <= int(time.time()) + 3600
    assert result.scheduled_for == datetime.fromtimestamp(feature["schedule_time"], tz=timezone.utc)


@responses.activate
def test_chunks_and_crc(client, video_file, monkeypatch):
    monkeypatch.setattr(uploader_mod, "CHUNK_SIZE", 1000)
    mock_tiktok(responses)
    client.upload(video_file, "chunks")
    parts = [c for c in responses.calls if "phase=transfer" in c.request.url]
    finish = [c for c in responses.calls if "phase=finish" in c.request.url]
    size = video_file.stat().st_size
    assert len(parts) == -(-size // 1000)
    assert all(len(c.request.headers["Content-Crc32"]) == 8 for c in parts)
    assert finish[0].request.body.startswith("1:")
    assert "sessionid" not in finish[0].request.headers.get("Cookie", "")


@pytest.mark.parametrize("kwargs, msg", [
    ({"schedule": 60}, "15 minutes"),
    ({"schedule": timedelta(days=31)}, "30 days"),
    ({"schedule": 3600, "visibility": 1}, "private"),
    ({"visibility": "friends"}, "visibility"),
])
def test_validation(client, video_file, kwargs, msg):
    with pytest.raises(ValidationError, match=msg):
        client.upload(video_file, "x", **kwargs)


def test_caption_and_file_validation(client, video_file):
    with pytest.raises(ValidationError):
        client.upload(video_file, "x" * 2201)
    with pytest.raises(ValidationError, match="not found"):
        client.upload("missing.mp4", "x")


def test_video_found_by_name_in_videos_dir(video_file):
    assert uploader_mod.resolve_video_path("clip.mp4") == video_file.resolve()


@responses.activate
def test_tiktok_rejection_is_not_retryable(client, video_file):
    mock_tiktok(responses, publish={"json": {"status_code": 3013046,
                                             "status_msg": "potential violation of our Community Guidelines"}})
    with pytest.raises(PublishError) as err:
        client.upload(video_file, "x")
    assert err.value.status_code == 3013046 and err.value.retryable is False


@responses.activate
def test_schedule_up_to_30_days(client, video_file):
    mock_tiktok(responses)
    before = int(time.time())
    client.upload(video_file, "later", schedule=timedelta(days=30))
    feature = json.loads(publish_call(responses).request.body)["feature_common_info_list"][0]
    assert feature["schedule_time"] >= before + 30 * 86400


@responses.activate
def test_rejected_long_schedule_mentions_10_day_accounts(client, video_file):
    mock_tiktok(responses, publish={"json": {"status_code": 5, "status_msg": "invalid parameters"}})
    with pytest.raises(PublishError, match="some accounts can only schedule up to 10 days") as err:
        client.upload(video_file, "x", schedule=timedelta(days=20))
    assert err.value.status_code == 5 and err.value.status_msg == "invalid parameters"


@responses.activate
def test_rejected_short_schedule_has_no_10_day_hint(client, video_file):
    mock_tiktok(responses, publish={"json": {"status_code": 5, "status_msg": "invalid parameters"}})
    with pytest.raises(PublishError) as err:
        client.upload(video_file, "x", schedule=timedelta(days=5))
    assert "10 days" not in str(err.value)


@responses.activate
def test_network_error_while_publishing_is_uncertain(client, video_file):
    mock_tiktok(responses, publish={"body": requests.ConnectionError("reset")})
    with pytest.raises(PublishUncertainError) as err:
        client.upload(video_file, "x")
    assert err.value.retryable is False


@responses.activate
def test_failure_before_publish_is_retryable(client, video_file):
    mock_tiktok(responses, apply_status=500)
    with pytest.raises(UploadError) as err:
        client.upload(video_file, "x")
    assert err.value.retryable is True
    assert not [c for c in responses.calls if "/project/post/" in c.request.url]


@responses.activate
def test_expired_session(client, video_file):
    mock_tiktok(responses, auth_json={"status_code": 8})
    with pytest.raises(NotLoggedInError):
        client.upload(video_file, "x")


def test_account_without_session():
    with pytest.raises(NotLoggedInError):
        Client(Account(name="empty"))


def test_proxy_reaches_requests_and_signer(saved_account, video_file, monkeypatch):
    seen = {}

    class RecordingSigner(FakeSigner):
        def __init__(self, user_agent, *, proxy=None, timeout=30):
            super().__init__()
            seen["signer_proxy"] = proxy
            seen["signer_ua"] = user_agent

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

    monkeypatch.setattr(uploader_mod, "Signer", RecordingSigner)
    client = Client(saved_account)
    session = client._session()
    assert session.proxies["https"] == "http://bob:secret@proxy.example:8000"
    with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
        mock_tiktok(rsps)
        client.upload(video_file, "x")
    assert seen["signer_proxy"].url == "http://bob:secret@proxy.example:8000"
    assert seen["signer_ua"] == "UA/1.0"


def test_proxy_override_and_disable(saved_account):
    assert Client(saved_account, proxy="h.example:1").proxy.url == "http://h.example:1"
    assert Client(saved_account, proxy=None).proxy is None
    assert Client(saved_account, proxy=False).proxy is None


@responses.activate
def test_upload_video_helper_loads_saved_account(saved_account, video_file, monkeypatch):
    monkeypatch.setattr(uploader_mod, "Signer", lambda *a, **k: _CtxSigner())
    mock_tiktok(responses)
    assert upload_video("alice", "clip.mp4", "hi").video_id == "v123"


class _CtxSigner(FakeSigner):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass


@responses.activate
def test_check_session(client):
    responses.add(responses.GET, f"{TT}/api/v1/video/upload/auth/", json={"video_token_v5": {}})
    assert client.check_session() is True
    responses.replace(responses.GET, f"{TT}/api/v1/video/upload/auth/", json={"status_code": 8})
    assert client.check_session() is False


@responses.activate
def test_environment_proxy_cannot_override_account_proxy(client, video_file, monkeypatch):
    monkeypatch.setenv("HTTPS_PROXY", "http://corporate.example:3128")
    monkeypatch.setenv("https_proxy", "http://corporate.example:3128")
    mock_tiktok(responses)
    client.upload(video_file, "x")
    used = {c.request.req_kwargs["proxies"]["https"] for c in responses.calls}
    assert used == {"http://bob:secret@proxy.example:8000"}


@responses.activate
def test_scheduled_datetime_is_kept_exactly(client, video_file):
    mock_tiktok(responses)
    when = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(hours=2)
    result = client.upload(video_file, "later", schedule=when)
    assert result.scheduled_for == when
