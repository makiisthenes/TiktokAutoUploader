import pytest

from autotok import AccountStore, cli
from autotok.uploader import UploadResult


def run(*argv):
    return cli.main(list(argv))


def test_help_without_command(capsys):
    assert run() == 1
    assert "upload" in capsys.readouterr().out


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


def test_version(capsys):
    with pytest.raises(SystemExit):
        run("--version")
    assert "autotok" in capsys.readouterr().out
