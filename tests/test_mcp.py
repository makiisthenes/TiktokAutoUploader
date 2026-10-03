import json
from datetime import datetime, timedelta, timezone

import pytest

pytest.importorskip("mcp")

from mcp import Client  # noqa: E402

from autotok import AccountStore, UploadResult, cli  # noqa: E402
from autotok.errors import PublishUncertainError, UploadError  # noqa: E402
from autotok.mcp_server import create_server  # noqa: E402

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def call(name, args=None, server=None):
    async with Client(server or create_server()) as client:
        result = await client.call_tool(name, args or {})
    text = result.content[0].text if result.content else ""
    if result.is_error:
        return True, text
    return False, json.loads(text)


@pytest.fixture
def uploads(monkeypatch):
    calls = []

    def fake_upload(self, video, caption, **kwargs):
        calls.append({"account": self.account.name, "video": video, "caption": caption, **kwargs})
        scheduled = None
        if kwargs.get("schedule") is not None:
            scheduled = datetime(2030, 1, 1, 18, 0, tzinfo=timezone.utc)
        return UploadResult(video_id="7429183650274961408", creation_id="c1", scheduled_for=scheduled)

    monkeypatch.setattr("autotok.uploader.Client.upload", fake_upload)
    return calls


async def test_lists_tools_with_annotations():
    async with Client(create_server()) as client:
        tools = {t.name: t for t in (await client.list_tools()).tools}
    assert set(tools) == {"list_accounts", "check_account", "list_videos", "upload_video", "login",
                          "login_status", "set_proxy", "test_proxy"}
    assert tools["list_accounts"].annotations.read_only_hint is True
    upload = tools["upload_video"].annotations
    assert upload.read_only_hint is False and upload.idempotent_hint is False and upload.open_world_hint is True
    assert "caption" in tools["upload_video"].input_schema["required"]


async def test_list_accounts_masks_proxy_and_never_returns_the_session(saved_account):
    error, data = await call("list_accounts")
    assert not error
    assert data == {"accounts": [{"name": "alice", "logged_in": True, "proxy": "http://bob:****@proxy.example:8000"}]}
    assert "sess-123" not in json.dumps(data) and "secret" not in json.dumps(data)


async def test_list_videos(video_file):
    error, data = await call("list_videos")
    assert not error
    assert [v["name"] for v in data["videos"]] == ["clip.mp4"]


async def test_upload_now(saved_account, video_file, uploads):
    error, data = await call("upload_video", {"account": "alice", "video": "clip.mp4", "caption": "Hello #fyp"})
    assert not error
    assert data == {"account": "alice", "video_id": "7429183650274961408", "status": "published"}
    assert uploads == [{"account": "alice", "video": "clip.mp4", "caption": "Hello #fyp", "schedule": None,
                        "visibility": "public", "allow_comment": True, "allow_duet": False,
                        "allow_stitch": False, "ai_label": False}]


async def test_upload_scheduled_in_minutes(saved_account, video_file, uploads):
    error, data = await call("upload_video", {"account": "alice", "video": "clip.mp4", "caption": "Later",
                                              "schedule_in_minutes": 60, "allow_duet": True})
    assert not error
    assert data["status"] == "scheduled" and data["scheduled_for"] == "2030-01-01T18:00:00+00:00"
    assert uploads[0]["schedule"] == 3600 and uploads[0]["allow_duet"] is True


async def test_upload_schedule_at_accepts_z_suffix(saved_account, video_file, uploads):
    when = (datetime.now(timezone.utc) + timedelta(hours=2)).replace(microsecond=0)
    error, _ = await call("upload_video", {"account": "alice", "video": "clip.mp4", "caption": "Later",
                                           "schedule_at": when.strftime("%Y-%m-%dT%H:%M:%SZ")})
    assert not error
    assert uploads[0]["schedule"] == when


async def test_upload_private(saved_account, video_file, uploads):
    error, _ = await call("upload_video", {"account": "alice", "video": "clip.mp4", "caption": "Me",
                                           "private": True})
    assert not error
    assert uploads[0]["visibility"] == "private"


@pytest.mark.parametrize("args, message", [
    ({"caption": "x"}, "exactly one of video or youtube_url"),
    ({"caption": "x", "video": "clip.mp4", "youtube_url": "https://youtu.be/abc"}, "exactly one of"),
    ({"caption": "x", "video": "clip.mp4", "schedule_in_minutes": 60, "schedule_at": "2030-01-01T00:00:00Z"},
     "at most one of schedule_in_minutes or schedule_at"),
    ({"caption": "x", "video": "clip.mp4", "schedule_at": "2030-01-01T18:00:00"}, "needs a UTC offset"),
    ({"caption": "x", "video": "clip.mp4", "schedule_at": "tomorrow"}, "not an ISO 8601"),
])
async def test_upload_rejects_bad_arguments(saved_account, video_file, uploads, args, message):
    error, text = await call("upload_video", {"account": "alice", **args})
    assert error and message in text
    assert uploads == []


async def test_upload_unknown_account_points_to_login():
    error, text = await call("upload_video", {"account": "nobody", "video": "clip.mp4", "caption": "x"})
    assert error and "no saved session for 'nobody'" in text and "login tool" in text


async def test_retryable_error_says_it_is_safe_to_retry(saved_account, video_file, monkeypatch):
    def fail(self, *a, **k):
        raise UploadError("upload chunk: HTTP 502")

    monkeypatch.setattr("autotok.uploader.Client.upload", fail)
    error, text = await call("upload_video", {"account": "alice", "video": "clip.mp4", "caption": "x"})
    assert error and "HTTP 502" in text and "safe to try again" in text


async def test_uncertain_publish_says_not_to_retry(saved_account, video_file, monkeypatch):
    def fail(self, *a, **k):
        raise PublishUncertainError("publish: connection reset")

    monkeypatch.setattr("autotok.uploader.Client.upload", fail)
    error, text = await call("upload_video", {"account": "alice", "video": "clip.mp4", "caption": "x"})
    assert error and "Do not retry" in text


async def test_upload_from_youtube(saved_account, uploads, monkeypatch, tmp_path):
    downloaded = tmp_path / "youtube-abc.mp4"
    monkeypatch.setattr("autotok.youtube.download", lambda url: downloaded)
    error, data = await call("upload_video", {"account": "alice", "youtube_url": "https://youtu.be/abc",
                                              "caption": "x"})
    assert not error
    assert uploads[0]["video"] == str(downloaded) and data["downloaded_to"] == str(downloaded)


async def test_check_account(saved_account, monkeypatch):
    monkeypatch.setattr("autotok.uploader.Client.check_session", lambda self: False)
    error, data = await call("check_account", {"account": "alice"})
    assert not error
    assert data["session_ok"] is False and "force=true" in data["message"]


async def test_login_reports_live_url_then_saved(monkeypatch):
    seen = {}

    def fake_login(name, *, proxy, timeout, store, on_live_url):
        seen.update(name=name, proxy=proxy)
        on_live_url("https://live.example/session/1")
        from autotok import Account

        store.save(Account.from_session_id(name, "sess-new", datacenter="useast5"))

    monkeypatch.setattr("autotok.auth.login_interactive", fake_login)
    server = create_server()
    async with Client(server) as client:
        started = json.loads((await client.call_tool("login", {"account": "carol"})).content[0].text)
        assert started["account"] == "carol"
        assert started["status"] in ("waiting", "saved")
        for _ in range(100):
            status = json.loads((await client.call_tool("login_status", {"account": "carol"})).content[0].text)
            if status["status"] != "waiting":
                break
    assert status["status"] == "saved"
    assert seen == {"name": "carol", "proxy": None}
    assert AccountStore().load("carol").session_id == "sess-new"


async def test_login_keeps_the_saved_proxy_when_forced(saved_account, monkeypatch):
    seen = {}

    def fake_login(name, *, proxy, **kwargs):
        seen["proxy"] = proxy

    monkeypatch.setattr("autotok.auth.login_interactive", fake_login)
    error, data = await call("login", {"account": "alice", "force": True})
    assert not error
    assert seen["proxy"].url == "http://bob:secret@proxy.example:8000"
    assert "secret" not in json.dumps(data)


async def test_login_does_not_replace_a_saved_session(saved_account, monkeypatch):
    monkeypatch.setattr("autotok.auth.login_interactive", lambda *a, **k: pytest.fail("should not log in"))
    error, data = await call("login", {"account": "alice"})
    assert not error and data["status"] == "saved" and "force=true" in data["message"]


async def test_login_failure_is_reported(monkeypatch):
    from autotok.errors import LoginError

    def fail(*a, **k):
        raise LoginError("timed out waiting for the login")

    monkeypatch.setattr("autotok.auth.login_interactive", fail)
    error, data = await call("login", {"account": "dave"})
    assert not error
    assert data["status"] == "failed" and "timed out" in data["error"]


async def test_login_rejects_a_bad_name():
    error, text = await call("login", {"account": "../evil"})
    assert error and "invalid account name" in text


async def test_set_and_clear_proxy(saved_account):
    error, data = await call("set_proxy", {"account": "alice", "proxy": "socks5://u:p@10.0.0.1:1080"})
    assert not error and data == {"account": "alice", "proxy": "socks5://u:****@10.0.0.1:1080"}
    error, data = await call("set_proxy", {"account": "alice", "proxy": None})
    assert not error and data["proxy"] is None
    assert AccountStore().load("alice").proxy is None


async def test_test_proxy_uses_the_account_proxy(saved_account, monkeypatch):
    monkeypatch.setattr("autotok.mcp_server.check_proxy", lambda p: "203.0.113.7")
    error, data = await call("test_proxy", {"account": "alice"})
    assert not error
    assert data == {"proxy": "http://bob:****@proxy.example:8000", "public_ip": "203.0.113.7"}


def test_cli_mcp_runs_stdio_by_default(monkeypatch):
    runs = []

    class FakeServer:
        def run(self, transport, **kwargs):
            runs.append((transport, kwargs))

    monkeypatch.setattr("autotok.mcp_server.create_server", lambda store, **k: FakeServer())
    assert cli.main(["mcp"]) == 0
    assert cli.main(["mcp", "--http", "--port", "9000"]) == 0
    assert runs == [("stdio", {}), ("streamable-http", {"host": "127.0.0.1", "port": 9000})]


async def test_stdio_server_keeps_stdout_for_the_protocol(saved_account):
    import os
    import sys

    from mcp import StdioServerParameters

    params = StdioServerParameters(command=sys.executable, args=["-m", "autotok", "mcp"], env=dict(os.environ))
    async with Client(params) as client:
        result = await client.call_tool("list_accounts", {})
    assert json.loads(result.content[0].text)["accounts"][0]["name"] == "alice"


def test_cli_mcp_without_the_extra(monkeypatch, capsys):
    import sys

    for mod in ("mcp", "mcp.server", "mcp.server.mcpserver", "mcp.server.mcpserver.exceptions", "mcp.types",
                "pydantic"):
        monkeypatch.setitem(sys.modules, mod, None)
    monkeypatch.delitem(sys.modules, "autotok.mcp_server")
    assert cli.main(["mcp"]) == 1
    assert 'pip install "autotok[mcp]"' in capsys.readouterr().err
