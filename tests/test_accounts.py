import json
import os
import pickle
import stat

import pytest

from autotok import Account, AccountStore
from autotok.errors import AccountNotFoundError, ValidationError


def test_save_and_load_roundtrip(autotok_home):
    store = AccountStore()
    acct = Account.from_session_id("alice", "s1", datacenter="dc1", proxy="h.example:8000")
    path = store.save(acct)
    assert path == autotok_home / "accounts" / "alice.json"
    if os.name == "posix":
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
    loaded = store.load("alice")
    assert loaded.session_id == "s1" and loaded.datacenter == "dc1"
    assert loaded.proxy == "http://h.example:8000"
    assert store.list() == ["alice"]


def test_missing_account():
    with pytest.raises(AccountNotFoundError):
        AccountStore().load("nobody")


@pytest.mark.parametrize("name", ["..", "a/b", "", "x" * 129, "bad name"])
def test_rejects_unsafe_names(name):
    with pytest.raises(ValidationError):
        AccountStore().path_for(name)


def test_legacy_pickle_is_migrated(tmp_path):
    legacy = tmp_path / "work" / "CookiesDir"
    legacy.mkdir()
    cookies = [{"name": "sessionid", "value": "old", "domain": ".tiktok.com"},
               {"name": "tt-target-idc", "value": "useast2a"}]
    with open(legacy / "tiktok_session-bob.cookie", "wb") as f:
        pickle.dump(cookies, f)

    store = AccountStore()
    assert "bob" in store.list()
    acct = store.load("bob")
    assert acct.session_id == "old"
    assert json.loads(store.path_for("bob").read_text())["cookies"] == cookies


class _Evil:
    def __reduce__(self):
        return (os.system, ("echo pwned",))


def test_legacy_pickle_cannot_run_code(tmp_path):
    legacy = tmp_path / "work" / "CookiesDir"
    legacy.mkdir()
    with open(legacy / "tiktok_session-eve.cookie", "wb") as f:
        pickle.dump([_Evil()], f)
    with pytest.raises(ValidationError, match="cannot migrate legacy session"):
        AccountStore().load("eve")
    assert not AccountStore().path_for("eve").exists()


def test_set_proxy_and_clear(saved_account):
    store = AccountStore()
    assert store.set_proxy("alice", "socks5://h.example:1080").proxy == "socks5://h.example:1080"
    assert store.set_proxy("alice", None).proxy is None


def test_delete(saved_account):
    store = AccountStore()
    assert store.delete("alice") is True
    assert not store.exists("alice")
