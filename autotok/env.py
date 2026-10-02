"""Reading settings from ``.env`` files.

The CLI calls :func:`load_env` on start, so settings such as
``AUTOTOK_BROWSER`` or ``BROWSERBASE_API_KEY`` can live in a ``.env`` file
(copy ``.env.example``). Files are read in this order, and nothing overrides a
variable that is already set:

1. variables already in the environment
2. ``.env`` in the current directory
3. ``$AUTOTOK_HOME/.env`` (``~/.autotok/.env``)

Python users can call ``autotok.load_env()`` themselves.
"""
from __future__ import annotations

import os
from pathlib import Path

from . import settings


def parse_env(text: str) -> dict[str, str]:
    """Parse ``KEY=value`` lines. Supports comments, ``export KEY=...`` and
    single or double quotes."""
    values: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        key, sep, value = line.partition("=")
        key = key.strip()
        if not sep or not key or not key.replace("_", "").isalnum():
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        else:
            # Unquoted values end at an inline comment: KEY=value  # note
            for marker in (" #", "\t#"):
                if marker in value:
                    value = value.split(marker, 1)[0].rstrip()
        values[key] = value
    return values


def load_env(*paths: "str | os.PathLike") -> list[Path]:
    """Load ``.env`` files into ``os.environ`` without overriding set variables.

    With no arguments, reads ``./.env`` then ``$AUTOTOK_HOME/.env``. Returns
    the files that were read.
    """
    candidates = [Path(p) for p in paths] if paths else [Path.cwd() / ".env"]
    read: list[Path] = []
    seen: set[Path] = set()

    def _load(path: Path) -> None:
        try:
            resolved = path.resolve()
            if resolved in seen or not path.is_file():
                return
            seen.add(resolved)
            text = path.read_text(encoding="utf-8-sig")
        except OSError:
            return
        for key, value in parse_env(text).items():
            os.environ.setdefault(key, value)
        read.append(path)

    for path in candidates:
        _load(path)
    if not paths:
        # Evaluated after ./.env, which may set AUTOTOK_HOME.
        _load(settings.home() / ".env")
    return read
