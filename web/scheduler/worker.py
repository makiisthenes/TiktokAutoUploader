"""Atomic claim + heartbeat + upload.

Pulled out of main.py so it can be unit-tested directly (freeze time, patch
the adapter, patch the heartbeat). The real service composes these.

Duplicate posts are the failure mode that matters most, so the rules are:
  * a job is retried automatically only when the upload failed before anything
    reached TikTok's publish endpoint (``UploadOutcome.retryable``);
  * a job found stuck in 'running' (the worker died mid-upload) is marked
    failed, not retried: it may already be live. The user can retry it.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from datetime import timedelta
from typing import Optional

from sqlalchemy import and_, update
from sqlmodel import Session, select

import api.db as _api_db
from api.db import now_utc
from api.models import Account, ScheduledUpload
from api.services import tiktok_adapter, youtube
from api.services import videos as library
from api.services.tiktok_adapter import UploadOutcome

log = logging.getLogger("scheduler.worker")

STALE_RUNNING_AFTER = timedelta(minutes=5)
MAX_ATTEMPTS = 3
RETRY_DELAY = timedelta(minutes=2)
HEARTBEAT_INTERVAL = 30.0  # seconds


def reclaim_stale(session: Session) -> int:
    """Rows stuck in 'running' beyond STALE_RUNNING_AFTER (no heartbeat, so the
    worker died) are marked failed. Called at the top of every poll cycle."""
    cutoff = now_utc() - STALE_RUNNING_AFTER
    rows = session.exec(
        select(ScheduledUpload).where(
            and_(
                ScheduledUpload.status == "running",
                ScheduledUpload.heartbeat_at < cutoff,
            )
        )
    ).all()
    for r in rows:
        r.status = "failed"
        r.result_text = (
            "the scheduler stopped during this upload; it may or may not have been posted. "
            "Check TikTok before retrying."
        )
        r.updated_at = now_utc()
        session.add(r)
    if rows:
        session.commit()
    return len(rows)


def claim_next_due(session: Session) -> Optional[ScheduledUpload]:
    """Pick one pending row whose scheduled_for is past and atomically claim
    it. Returns None if nothing is due. The UPDATE...WHERE status='pending'
    clause is the race guard: only one worker wins if two race."""
    now = now_utc()
    row = session.exec(
        select(ScheduledUpload)
        .where(ScheduledUpload.status == "pending")
        .where(ScheduledUpload.scheduled_for <= now)
        .order_by(ScheduledUpload.scheduled_for)
        .limit(1)
    ).first()
    if not row:
        return None

    result = session.exec(
        update(ScheduledUpload)
        .where(ScheduledUpload.id == row.id)
        .where(ScheduledUpload.status == "pending")
        .values(
            status="running",
            attempts=ScheduledUpload.attempts + 1,
            heartbeat_at=now,
            updated_at=now,
        )
    )
    session.commit()
    if result.rowcount != 1:
        return None  # lost the race
    session.expire_all()
    return session.get(ScheduledUpload, row.id)


class Heartbeat:
    """Background thread that bumps heartbeat_at every HEARTBEAT_INTERVAL
    while an upload is in flight. Lets reclaim_stale distinguish a wedged
    worker from a healthy long-running upload."""

    def __init__(self, schedule_id: int):
        self.schedule_id = schedule_id
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=HEARTBEAT_INTERVAL + 5)

    def _run(self) -> None:
        while not self._stop.wait(HEARTBEAT_INTERVAL):
            try:
                with Session(_api_db.engine) as s:
                    row = s.get(ScheduledUpload, self.schedule_id)
                    if not row or row.status != "running":
                        return
                    row.heartbeat_at = now_utc()
                    s.add(row)
                    s.commit()
            except Exception:  # pragma: no cover - best-effort
                log.exception("heartbeat write failed")


def run_one(row: ScheduledUpload) -> UploadOutcome:
    """Execute a single claimed row. Never raises."""
    with Session(_api_db.engine) as s:
        acct = s.get(Account, row.account_id)
        if not acct:
            return UploadOutcome(ok=False, message="account row missing")
        username = acct.username

    if row.source_type == "youtube":
        try:
            video_path = youtube.download(row.source_ref)
        except Exception as e:
            return UploadOutcome(ok=False, message=f"youtube download failed: {e}", retryable=True)
    else:
        try:
            video_path = str(library.resolve(row.source_ref))
        except ValueError as e:
            return UploadOutcome(ok=False, message=str(e))

    try:
        options = json.loads(row.options_json or "{}")
    except ValueError:
        return UploadOutcome(ok=False, message="invalid options_json")
    return tiktok_adapter.upload_from_options(username, video_path, row.title, options)


def finalize(schedule_id: int, outcome: UploadOutcome) -> None:
    with Session(_api_db.engine) as s:
        row = s.get(ScheduledUpload, schedule_id)
        if not row:
            return
        now = now_utc()
        if outcome.ok:
            row.status = "succeeded"
            row.result_text = f"published (video id {outcome.video_id})" if outcome.video_id else "published"
            acct = s.get(Account, row.account_id)
            if acct:
                acct.last_used_at = now
                s.add(acct)
        elif outcome.retryable and row.attempts < MAX_ATTEMPTS:
            row.status = "pending"
            row.scheduled_for = now + RETRY_DELAY * row.attempts
            row.result_text = f"attempt {row.attempts} failed, will retry: {outcome.message}"
        else:
            row.status = "failed"
            row.result_text = outcome.message
        row.updated_at = now
        s.add(row)
        s.commit()


def tick() -> bool:
    """One poll cycle. Returns True if a job was processed, False if idle.
    Visible in tests so they can drive the worker deterministically."""
    with Session(_api_db.engine) as s:
        reclaim_stale(s)
        claimed = claim_next_due(s)
    if not claimed:
        return False

    hb = Heartbeat(claimed.id)
    hb.start()
    try:
        outcome = run_one(claimed)
    except Exception as e:  # pragma: no cover - run_one is defensive already
        log.exception("job %s crashed", claimed.id)
        outcome = UploadOutcome(ok=False, message=f"scheduler error: {e}")
    finally:
        hb.stop()
    finalize(claimed.id, outcome)
    log.info("job %s: %s", claimed.id, "succeeded" if outcome.ok else outcome.message)
    return True


def loop(poll_interval: float = 30.0) -> None:  # pragma: no cover - driven by tick() in tests
    log.info("scheduler loop starting, poll_interval=%ss", poll_interval)
    while True:
        try:
            busy = tick()
        except Exception:
            log.exception("tick failed")
            busy = False
        if not busy:
            time.sleep(poll_interval)
