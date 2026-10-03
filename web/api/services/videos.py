"""The video library: files in ``AUTOTOK_VIDEOS_DIR`` on the shared volume.

Scheduled local uploads reference a file *name* in this folder; paths outside
it are rejected so the API can't be used to upload arbitrary files.
"""
from __future__ import annotations

import re
from pathlib import Path

from autotok import settings

ALLOWED_SUFFIXES = {".mp4", ".webm", ".mov"}
_UNSAFE = re.compile(r"[^A-Za-z0-9._\- ]+")


def library_dir() -> Path:
    d = settings.videos_dir()
    d.mkdir(parents=True, exist_ok=True)
    return d


def resolve(name_or_path: str) -> Path:
    """Return the library file for ``name_or_path`` or raise ``ValueError``."""
    root = library_dir().resolve()
    candidate = Path(name_or_path)
    path = (candidate if candidate.is_absolute() else root / candidate).resolve()
    if path.parent != root:
        raise ValueError("video must be a file in the video library")
    if not path.is_file():
        raise ValueError(f"video '{candidate.name}' is not in the video library")
    return path


def safe_filename(filename: str) -> str:
    """Sanitise an uploaded file name and avoid overwriting existing files."""
    base = Path(filename or "video.mp4").name
    stem, suffix = Path(base).stem, Path(base).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError(f"unsupported file type '{suffix or '?'}' (use {', '.join(sorted(ALLOWED_SUFFIXES))})")
    stem = _UNSAFE.sub("_", stem).strip(" .") or "video"
    root = library_dir()
    name, n = f"{stem}{suffix}", 1
    while (root / name).exists():
        n += 1
        name = f"{stem}-{n}{suffix}"
    return name
