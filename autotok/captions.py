"""Caption markup: turns ``#hashtags`` and ``@mentions`` into the ``markup_text``
and ``text_extra`` fields TikTok's web uploader sends, so they are clickable.

Offsets are counted in UTF-16 code units, like the JavaScript client does, so
captions with emoji keep their hashtags aligned.
"""
from __future__ import annotations

import logging
import re
from typing import Callable, Optional

log = logging.getLogger("autotok")

# Hashtags: any word characters. Mentions: TikTok usernames are letters,
# digits, '_' and '.', and cannot end with '.'.
_TOKEN_RE = re.compile(r"#(\w+)|@([A-Za-z0-9_.]*[A-Za-z0-9_])")
_USER_ID_RE = re.compile(r'"userInfo":\{"user":\{"id":"(\d+)"')

UserResolver = Callable[[str], Optional[str]]


def utf16_len(text: str) -> int:
    return len(text.encode("utf-16-le")) // 2


def build_caption(text: str, resolve_user: UserResolver | None = None) -> tuple[str, list[dict]]:
    """Return ``(markup_text, text_extra)`` for ``text``.

    ``resolve_user`` maps a username to TikTok's numeric user id. Mentions it
    cannot resolve are left as plain text instead of failing the upload.
    """
    markup: list[str] = []
    extras: list[dict] = []
    offset = 0
    last = 0
    next_id = 0
    for match in _TOKEN_RE.finditer(text):
        plain = text[last:match.start()]
        markup.append(plain)
        offset += utf16_len(plain)
        token = match.group(0)
        hashtag, mention = match.group(1), match.group(2)

        if hashtag:
            extras.append(_extra(offset, offset + utf16_len(token), 1, hashtag, "", next_id))
            markup.append(f'<h id="{next_id}">{token}</h>')
            next_id += 1
        else:
            user_id = resolve_user(mention) if resolve_user else None
            if user_id:
                extras.append(_extra(offset, offset + utf16_len(token), 0, "", user_id, next_id))
                markup.append(f'<m id="{next_id}">{token}</m>')
                next_id += 1
            else:
                markup.append(token)
        offset += utf16_len(token)
        last = match.end()
    markup.append(text[last:])
    return "".join(markup), extras


def _extra(start: int, end: int, kind: int, hashtag: str, user_id: str, tag_id: int) -> dict:
    return {
        "end": end,
        "hashtag_name": hashtag,
        "start": start,
        "tag_id": str(tag_id),
        "type": kind,
        "user_id": user_id,
    }


def make_user_resolver(session, user_agent: str, timeout: float = 15.0) -> UserResolver:
    """Resolve usernames by reading the profile page with the upload session."""

    def resolve(username: str) -> str | None:
        try:
            r = session.get(
                f"https://www.tiktok.com/@{username}",
                headers={"user-agent": user_agent, "accept": "text/html"},
                timeout=timeout,
            )
            m = _USER_ID_RE.search(r.text)
        except Exception as exc:  # network errors must not fail the upload
            log.warning("Could not look up @%s (%s); leaving it as plain text", username, exc)
            return None
        if not m:
            log.warning("Could not find TikTok user @%s; leaving it as plain text", username)
            return None
        return m.group(1)

    return resolve
