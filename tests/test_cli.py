import io
import json
from datetime import datetime, timezone

import pytest

from autotok import AccountStore, PublishError, PublishUncertainError, UploadError, cli
from autotok.uploader import UploadResult


def run(*argv):
    return cli.main(list(argv))


def test_help_without_command(capsys):
    assert run() == 1
    out = capsys.readouterr().out
    assert "upload" in out and "autotok setup" in out


def test_setup_needs_a_terminal(capsys):
    assert run("setup") == 2
    assert "autotok login -n <name> -p <proxy>" in capsys.readouterr().err


def test_login_with_sessionid_and_proxy(capsys):
    assert run("login", "-n", "alice", "--sessionid", "s1", "--datacenter", "dc", "-p", "h.example:9") == 0
    acct = AccountStore().load("alice")
    assert acct.session_id == "s1" and acct.datacenter == "dc" and acct.proxy == "http://h.example:9"


def test_login_refuses_to_overwrite_without_force(saved_account, capsys, monkeypatch):
    called = []
    monkeypatch.setattr("autotok.auth.login_interactive", lambda *a, **k: called.append(k))
    assert run("login", "-n", "alice") == 0
    assert "already saved" in capsys.readouterr().out and not called


def test_relogin_keeps_saved_proxy(saved_account, monkeypatch):
    seen = {}
    monkeypatch.setattr("autotok.auth.login_interactive", lambda name, **k: seen.update(k))
    assert run("login", "-n", "alice", "--force") == 0
    assert seen["proxy"] == "http://bob:secret@proxy.example:8000"


def test_upload_uses_account_proxy_and_flags(saved_account, video_file, monkeypatch, capsys):
    seen = {}

    def fake_upload(self, video, caption, **kw):
        seen.update(kw, video=video, caption=caption, proxy=self.proxy)
        return UploadResult(video_id="v9", creation_id="c")

    monkeypatch.setattr("autotok.uploader.Client.upload", fake_upload)
    # 1.x-style flags: --users, -vi, -ct, -d, -st, -bo
    rc = run("upload", "--users", "alice", "-v", "clip.mp4", "-t", "hi #x",
             "-vi", "1", "-ct", "0", "-d", "1", "-st", "1", "-bo", "0")
    assert rc == 0
    assert seen["visibility"] == 1 and seen["allow_comment"] is False
    assert seen["allow_duet"] is True and seen["allow_stitch"] is True
    assert seen["proxy"].masked() == "http://bob:****@proxy.example:8000"
    assert "v9" in capsys.readouterr().out


def test_upload_reads_the_caption_from_a_file_or_stdin(saved_account, video_file, monkeypatch, tmp_path):
    captions = []
    monkeypatch.setattr("autotok.uploader.Client.upload",
                        lambda self, video, caption, **k: captions.append(caption) or UploadResult("v", "c"))
    caption = "-50% off \U0001f389\nsecond line"
    (tmp_path / "caption.txt").write_bytes(b"\xef\xbb\xbf" + caption.encode() + b"\r\n")  # with a BOM
    assert run("upload", "-u", "alice", "-v", "clip.mp4", "--title-file", str(tmp_path / "caption.txt")) == 0

    class Stdin:
        buffer = io.BytesIO(caption.encode() + b"\n")

    monkeypatch.setattr("sys.stdin", Stdin)
    assert run("upload", "-u", "alice", "-v", "clip.mp4", "--title-file=-") == 0
    assert captions == [caption, caption]


def test_upload_caption_file_mistakes(saved_account, video_file, tmp_path, capsys):
    assert run("upload", "-u", "alice", "-v", "clip.mp4", "--title-file", str(tmp_path / "missing.txt")) == 2
    assert "cannot read the caption" in capsys.readouterr().err
    (tmp_path / "latin1.txt").write_bytes("caf\xe9".encode("latin-1"))
    assert run("upload", "-u", "alice", "-v", "clip.mp4", "--title-file", str(tmp_path / "latin1.txt")) == 2
    assert "not UTF-8" in capsys.readouterr().err
    with pytest.raises(SystemExit):  # one or the other, not both
        run("upload", "-u", "alice", "-v", "clip.mp4", "-t", "x", "--title-file", "-")


def test_upload_proxy_flags(saved_account, monkeypatch):
    proxies = []
    monkeypatch.setattr("autotok.uploader.Client.upload",
                        lambda self, *a, **k: proxies.append(self.proxy) or UploadResult("v", "c"))
    run("upload", "-u", "alice", "-v", "x.mp4", "-t", "t", "-p", "other.example:1")
    run("upload", "-u", "alice", "-v", "x.mp4", "-t", "t", "--no-proxy")
    assert proxies[0].url == "http://other.example:1" and proxies[1] is None


def test_upload_unknown_account(capsys):
    assert run("upload", "-u", "ghost", "-v", "x.mp4", "-t", "t") == 1
    assert "autotok login -n ghost" in capsys.readouterr().err


def test_bad_schedule_is_reported(saved_account, video_file, capsys):
    assert run("upload", "-u", "alice", "-v", "clip.mp4", "-t", "t", "-sc", "10") == 2
    assert "15 minutes" in capsys.readouterr().err


def json_out(capsys):
    out = capsys.readouterr().out
    assert out.count("\n") == 1, out  # one JSON document, nothing else on stdout
    return json.loads(out)


def test_upload_json(saved_account, video_file, monkeypatch, capsys):
    when = datetime(2026, 11, 2, 18, 30, 15, 123456, tzinfo=timezone.utc)
    monkeypatch.setattr("autotok.uploader.Client.upload",
                        lambda self, *a, **k: UploadResult("v9", "c1", scheduled_for=when))
    assert run("--json", "upload", "-u", "alice", "-v", "clip.mp4", "-t", "hi", "-sc", "3600") == 0
    assert json_out(capsys) == {"video_id": "v9", "creation_id": "c1", "scheduled_for": "2026-11-02T18:30:15Z"}

    monkeypatch.setattr("autotok.uploader.Client.upload", lambda self, *a, **k: UploadResult("v9", "c1"))
    assert run("--json", "upload", "-u", "alice", "-v", "clip.mp4", "-t", "hi") == 0
    assert json_out(capsys)["scheduled_for"] is None


@pytest.mark.parametrize("exc, code, expected", [
    (PublishError("blocked", status_code=7, status_msg="guidelines"), 1,
     {"type": "PublishError", "message": "blocked", "retryable": False, "status_code": 7, "status_msg": "guidelines"}),
    (UploadError("transfer failed", status=503), 1,
     {"type": "UploadError", "message": "transfer failed", "retryable": True, "status": 503}),
    (PublishUncertainError("connection lost"), 1,
     {"type": "PublishUncertainError", "message": "connection lost", "retryable": False}),
    (RuntimeError("bug"), 1, {"type": "Error", "message": "bug", "retryable": False}),
])
def test_upload_json_errors(saved_account, video_file, monkeypatch, capsys, exc, code, expected):
    def fail(self, *a, **k):
        raise exc

    monkeypatch.setattr("autotok.uploader.Client.upload", fail)
    assert run("--json", "upload", "-u", "alice", "-v", "clip.mp4", "-t", "hi") == code
    assert json_out(capsys) == {"error": expected}


def test_json_mistakes_and_unknown_accounts(saved_account, video_file, capsys):
    assert run("--json", "upload", "-u", "alice", "-v", "clip.mp4", "-t", "t", "-sc", "10") == 2
    error = json_out(capsys)["error"]
    assert error["type"] == "ValidationError" and "15 minutes" in error["message"]
    assert run("--json", "upload", "-u", "ghost", "-v", "clip.mp4", "-t", "t") == 1
    assert json_out(capsys)["error"]["type"] == "AccountNotFoundError"
    assert run("--json", "show", "-u") == 2
    assert json_out(capsys)["error"]["message"] == "--json works with the upload and accounts commands"


def test_accounts_json(saved_account, monkeypatch, capsys):
    (AccountStore().root / "broken.json").write_text("{not json")
    assert run("--json", "accounts", "list") == 0
    alice, broken = json_out(capsys)["accounts"]
    assert alice == {"name": "alice", "session": True, "proxy": "http://bob:****@proxy.example:8000"}
    assert broken["name"] == "broken" and broken["session"] is False and broken["error"]

    monkeypatch.setattr("autotok.uploader.Client.check_session", lambda self: False)
    assert run("--json", "accounts", "check", "alice") == 1
    assert json_out(capsys) == {"name": "alice", "session_ok": False}

    assert run("--json", "accounts", "remove", "alice") == 0
    assert json_out(capsys) == {"name": "alice", "removed": True}
    assert run("--json", "accounts", "remove", "alice") == 1
    assert json_out(capsys) == {"name": "alice", "removed": False}


def test_proxy_commands(saved_account, capsys, monkeypatch):
    assert run("proxy", "set", "alice", "u:p@h.example:1") == 0
    assert "http://u:****@h.example:1" in capsys.readouterr().out
    monkeypatch.setattr(cli, "check_proxy", lambda p: "203.0.113.7")
    assert run("proxy", "test", "-u", "alice") == 0
    assert "203.0.113.7" in capsys.readouterr().out
    assert run("proxy", "clear", "alice") == 0
    assert AccountStore().load("alice").proxy is None


def test_accounts_list_masks_password(saved_account, capsys):
    assert run("accounts", "list") == 0
    out = capsys.readouterr().out
    assert "alice" in out and "secret" not in out


def test_show_lists_accounts_and_videos(saved_account, video_file, capsys):
    assert run("show", "-u", "-v") == 0
    out = capsys.readouterr().out
    assert "alice" in out and "clip.mp4" in out


def test_python_dash_m_entry_point():
    import subprocess
    import sys

    out = subprocess.run([sys.executable, "-m", "autotok", "--version"], capture_output=True, text=True)
    assert out.returncode == 0 and "autotok" in out.stdout


def test_version(capsys):
    with pytest.raises(SystemExit):
        run("--version")
    assert "autotok" in capsys.readouterr().out
