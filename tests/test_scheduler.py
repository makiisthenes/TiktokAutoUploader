from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session, SQLModel

import api.db as api_db
from api.models import Account, ScheduledUpload
from api.services.tiktok_adapter import UploadOutcome
from scheduler import worker


@pytest.fixture
def engine(tmp_path):
    eng = api_db.make_engine(f"sqlite:///{tmp_path / 'sched.db'}")
    old = api_db.engine
    api_db.override_engine(eng)
    api_db.init_db()
    yield eng
    api_db.override_engine(old)
    SQLModel.metadata.drop_all(eng)


@pytest.fixture
def job(engine, video_file):
    with Session(engine) as s:
        acct = Account(username="alice", cookie_path="x")
        s.add(acct)
        s.commit()
        s.refresh(acct)
        row = ScheduledUpload(account_id=acct.id, source_type="local", source_ref="clip.mp4",
                              title="t", scheduled_for=datetime.now(timezone.utc) - timedelta(seconds=1))
        s.add(row)
        s.commit()
        s.refresh(row)
        return row.id


def _row(engine, job_id):
    with Session(engine) as s:
        return s.get(ScheduledUpload, job_id)


def _fake(monkeypatch, outcome):
    calls = []

    def fake(username, video_path, title, options):
        calls.append(video_path)
        return outcome

    monkeypatch.setattr("api.services.tiktok_adapter.upload_from_options", fake)
    return calls


def test_success_posts_exactly_once(engine, job, monkeypatch, video_file):
    calls = _fake(monkeypatch, UploadOutcome(ok=True, message="published", video_id="v1"))
    assert worker.tick() is True
    assert worker.tick() is False  # nothing left to do: no duplicate post
    row = _row(engine, job)
    assert len(calls) == 1 and calls[0] == str(video_file.resolve())
    assert row.status == "succeeded" and "v1" in row.result_text


def test_tiktok_rejection_is_not_retried(engine, job, monkeypatch):
    calls = _fake(monkeypatch, UploadOutcome(ok=False, message="guidelines", retryable=False))
    worker.tick()
    assert worker.tick() is False
    assert len(calls) == 1 and _row(engine, job).status == "failed"


def test_retryable_failure_backs_off(engine, job, monkeypatch):
    _fake(monkeypatch, UploadOutcome(ok=False, message="network", retryable=True))
    worker.tick()
    row = _row(engine, job)
    assert row.status == "pending" and row.attempts == 1
    assert row.scheduled_for.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)
    assert worker.tick() is False  # not due yet


def test_gives_up_after_max_attempts(engine, job, monkeypatch):
    _fake(monkeypatch, UploadOutcome(ok=False, message="network", retryable=True))
    for _ in range(worker.MAX_ATTEMPTS):
        with Session(engine) as s:
            row = s.get(ScheduledUpload, job)
            row.scheduled_for = datetime.now(timezone.utc) - timedelta(seconds=1)
            s.add(row)
            s.commit()
        worker.tick()
    row = _row(engine, job)
    assert row.status == "failed" and row.attempts == worker.MAX_ATTEMPTS


def test_stale_running_job_is_failed_not_retried(engine, job):
    with Session(engine) as s:
        row = s.get(ScheduledUpload, job)
        row.status = "running"
        row.heartbeat_at = datetime.now(timezone.utc) - timedelta(hours=1)
        s.add(row)
        s.commit()
        assert worker.reclaim_stale(s) == 1
    row = _row(engine, job)
    assert row.status == "failed" and "Check TikTok" in row.result_text


def test_missing_library_file_fails_cleanly(engine, job, monkeypatch, video_file):
    video_file.unlink()
    calls = _fake(monkeypatch, UploadOutcome(ok=True, message="published"))
    worker.tick()
    assert not calls and _row(engine, job).status == "failed"
