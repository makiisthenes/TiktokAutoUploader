"""Paths and environment-driven settings.

Everything is resolved at call time (not import time) so environment changes,
tests and long-running services always see the current values.

Environment variables:

``AUTOTOK_HOME``
    Data directory. Defaults to ``~/.autotok``.
``AUTOTOK_VIDEOS_DIR``
    Where videos are looked up and YouTube downloads are saved. Defaults to
    ``$AUTOTOK_HOME/videos``.
``AUTOTOK_BROWSER_PATH``
    Use this Chrome/Chromium binary instead of Playwright's bundled Chromium.
``AUTOTOK_BROWSER_CHANNEL``
    Playwright channel such as ``chrome`` to use an installed Google Chrome.
"""
from __future__ import annotations

import os
from pathlib import Path

TIKTOK_LOGIN_URL = "https://www.tiktok.com/login"

# Used when an account has no user agent recorded (e.g. sessions imported by
# hand or created by older versions). Accounts logged in with ``autotok login``
# store the real user agent of the browser that created the session.
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)

LEGACY_COOKIES_DIRNAME = "CookiesDir"
LEGACY_VIDEOS_DIRNAME = "VideosDirPath"


def home() -> Path:
    env = os.environ.get("AUTOTOK_HOME")
    return Path(env).expanduser() if env else Path.home() / ".autotok"


def accounts_dir() -> Path:
    return home() / "accounts"


def videos_dir() -> Path:
    env = os.environ.get("AUTOTOK_VIDEOS_DIR")
    return Path(env).expanduser() if env else home() / "videos"


def legacy_cookie_dirs() -> list[Path]:
    """Folders written by TiktokAutoUploader 1.x (``python cli.py login``)."""
    return [Path.cwd() / LEGACY_COOKIES_DIRNAME]


def legacy_video_dirs() -> list[Path]:
    return [Path.cwd() / LEGACY_VIDEOS_DIRNAME]


def video_search_dirs() -> list[Path]:
    dirs = [videos_dir()]
    dirs.extend(d for d in legacy_video_dirs() if d not in dirs)
    return dirs


def browser_executable() -> str | None:
    return os.environ.get("AUTOTOK_BROWSER_PATH") or None


def browser_channel() -> str | None:
    return os.environ.get("AUTOTOK_BROWSER_CHANNEL") or None
