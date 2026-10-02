"""Download YouTube videos for upload (``pip install "autotok[youtube]"``)."""
from __future__ import annotations

import logging
import re
from pathlib import Path

from . import settings
from .errors import AutotokError, MissingDependencyError, ValidationError
from .proxy import Proxy, parse_proxy

log = logging.getLogger("autotok")

_YOUTUBE_RE = re.compile(
    r"^https?://(?:www\.|m\.)?(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)[\w\-]+",
    re.IGNORECASE,
)


def is_youtube_url(value: str) -> bool:
    return bool(_YOUTUBE_RE.match((value or "").strip()))


def download(url: str, dest_dir: "str | Path | None" = None, *, proxy: "str | Proxy | None" = None) -> Path:
    """Download ``url`` and return the path of the video file.

    Files are named after the YouTube id (``youtube-<id>.mp4``), so different
    videos never overwrite each other.
    """
    if not is_youtube_url(url):
        raise ValidationError(f"not a YouTube URL: {url}")
    try:
        import yt_dlp
    except ImportError:
        raise MissingDependencyError(
            'YouTube downloads need the youtube extra: pip install "autotok[youtube]"'
        ) from None

    dest = Path(dest_dir) if dest_dir else settings.videos_dir()
    dest.mkdir(parents=True, exist_ok=True)
    opts = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": str(dest / "youtube-%(id)s.%(ext)s"),
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    p = parse_proxy(proxy)
    if p:
        opts["proxy"] = p.url
    log.info("Downloading %s", url)
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloads = info.get("requested_downloads") or []
            path = Path(downloads[0]["filepath"]) if downloads else Path(ydl.prepare_filename(info))
    except Exception as exc:
        raise AutotokError(f"YouTube download failed: {exc}") from exc
    if not path.is_file():
        raise AutotokError(f"YouTube download finished but {path} is missing")
    return path
