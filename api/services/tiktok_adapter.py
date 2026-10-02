"""The one place the API and the scheduler call into autotok to upload.

Never raises for upload problems: everything comes back as an
:class:`UploadOutcome`, with ``retryable`` set only when nothing reached
TikTok's publish endpoint (so retrying cannot create a duplicate post). Tests
patch ``upload_from_options``.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

from autotok import Client
from autotok.errors import AutotokError
from autotok.proxy import parse_proxy

log = logging.getLogger("api.upload")


@dataclass
class UploadOutcome:
    ok: bool
    message: str
    retryable: bool = False
    video_id: Optional[str] = None


def upload_from_options(username: str, video_path: str, title: str, options: dict[str, Any]) -> UploadOutcome:
    try:
        override = parse_proxy(options.get("proxy") or None)
        client = Client.from_account(username, proxy=override if override else True)
        result = client.upload(
            video_path,
            title,
            visibility=int(options.get("visibility_type", 0)),
            allow_comment=bool(int(options.get("allow_comment", 1))),
            allow_duet=bool(int(options.get("allow_duet", 0))),
            allow_stitch=bool(int(options.get("allow_stitch", 0))),
            ai_label=bool(int(options.get("ai_label", 0))),
        )
    except AutotokError as exc:
        return UploadOutcome(ok=False, message=str(exc), retryable=exc.retryable)
    except Exception as exc:  # a bug: never retry automatically, it may have posted
        log.exception("unexpected upload failure")
        return UploadOutcome(ok=False, message=f"unexpected error: {exc}", retryable=False)
    return UploadOutcome(ok=True, message="published", video_id=result.video_id)
