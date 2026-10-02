import os
from pathlib import Path

import pytest

from autotok import cli
from autotok.env import load_env, parse_env


@pytest.fixture
def env(monkeypatch):
    """A throwaway copy of os.environ, so loaded values don't leak between tests."""
    copy = os.environ.copy()
    monkeypatch.setattr(os, "environ", copy)
    return copy


def test_parse_env():
    text = """
# comment
AUTOTOK_BROWSER=steel
export STEEL_BASE_URL=http://localhost:3000   # self-hosted
QUOTED="has # hash"
SINGLE='x y'
EMPTY=
not a line
=novalue
"""
    assert parse_env(text) == {
        "AUTOTOK_BROWSER": "steel",
        "STEEL_BASE_URL": "http://localhost:3000",
        "QUOTED": "has # hash",
        "SINGLE": "x y",
        "EMPTY": "",
    }


def test_example_file_parses():
    example = Path(__file__).resolve().parent.parent / ".env.example"
    values = parse_env(example.read_text(encoding="utf-8"))
    assert values["AUTOTOK_BROWSER"] == "local"
    assert values["BROWSERBASE_API_KEY"] == "" and values["STEEL_BASE_URL"] == ""


def test_environment_wins_over_file(env, tmp_path):
    (tmp_path / ".env").write_text("AUTOTOK_BROWSER=steel\nNEW_SETTING=1\n", encoding="utf-8")
    env["AUTOTOK_BROWSER"] = "browserbase"
    assert load_env(tmp_path / ".env") == [tmp_path / ".env"]
    assert env["AUTOTOK_BROWSER"] == "browserbase" and env["NEW_SETTING"] == "1"


def test_cwd_then_autotok_home(env, autotok_home, tmp_path):
    env.pop("AUTOTOK_BROWSER", None)
    env.pop("STEEL_API_KEY", None)
    Path(".env").write_text("AUTOTOK_BROWSER=steel\n", encoding="utf-8-sig")  # BOM, like Notepad
    (autotok_home / ".env").write_text("AUTOTOK_BROWSER=local\nSTEEL_API_KEY=from-home\n", encoding="utf-8")
    assert len(load_env()) == 2
    assert env["AUTOTOK_BROWSER"] == "steel" and env["STEEL_API_KEY"] == "from-home"


def test_cli_reads_dotenv(env, capsys):
    env.pop("AUTOTOK_BROWSER", None)
    Path(".env").write_text("AUTOTOK_BROWSER=steel\n", encoding="utf-8")
    assert cli.main(["install-browser"]) == 0
    assert "Not needed" in capsys.readouterr().out
