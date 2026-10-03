import os
import tempfile
from pathlib import Path

import pytest

# api.db builds its engine at import time; point it somewhere harmless first.
os.environ.setdefault("TIKTOK_API_DB_PATH", str(Path(tempfile.mkdtemp()) / "import.db"))


@pytest.fixture(autouse=True)
def autotok_home(tmp_path, monkeypatch):
    """Isolate every test: fresh AUTOTOK_HOME, videos dir and working directory."""
    home = tmp_path / "home"
    videos = tmp_path / "videos"
    work = tmp_path / "work"
    for d in (home, videos, work):
        d.mkdir()
    monkeypatch.setenv("AUTOTOK_HOME", str(home))
    monkeypatch.setenv("AUTOTOK_VIDEOS_DIR", str(videos))
    # setenv (not delenv) so values set during a test, e.g. by `--browser`, are undone.
    monkeypatch.setenv("AUTOTOK_BROWSER", "local")
    for var in ("BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "BROWSERBASE_REGION", "BROWSERBASE_PROXY_COUNTRY",
                "STEEL_API_KEY", "STEEL_BASE_URL", "STEEL_CONNECT_URL"):
        monkeypatch.setenv(var, "")
    monkeypatch.chdir(work)
    return home


@pytest.fixture
def videos_dir(tmp_path):
    return tmp_path / "videos"


@pytest.fixture
def video_file(videos_dir):
    path = videos_dir / "clip.mp4"
    path.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"x" * 2048)
    return path


@pytest.fixture
def saved_account():
    from autotok import Account, AccountStore

    account = Account.from_session_id(
        "alice", "sess-123", datacenter="useast5", user_agent="UA/1.0",
        proxy="http://bob:secret@proxy.example:8000",
    )
    AccountStore().save(account)
    return account
