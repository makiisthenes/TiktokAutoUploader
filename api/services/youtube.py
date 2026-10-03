"""YouTube URL resolution for the API and the scheduler (tests patch ``download``)."""
from __future__ import annotations

from autotok import youtube as _youtube
from autotok.youtube import is_youtube_url  # noqa: F401  (re-exported for schemas)


def download(url: str) -> str:
    """Download into the videos folder and return the absolute file path."""
    return str(_youtube.download(url))
