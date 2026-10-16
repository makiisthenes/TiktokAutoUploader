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
    assert row.publish_uncertain is True


def test_missing_library_file_fails_cleanly(engine, job, monkeypatch, video_file):
    video_file.unlink()
    calls = _fake(monkeypatch, UploadOutcome(ok=True, message="published"))
    worker.tick()
    assert not calls and _row(engine, job).status == "failed"


def test_uncertain_failure_is_flagged(engine, job, monkeypatch):
    _fake(monkeypatch, UploadOutcome(ok=False, message="publish: connection reset", uncertain=True))
    worker.tick()
    row = _row(engine, job)
    assert row.status == "failed" and row.publish_uncertain is True


def test_definite_failure_is_not_flagged(engine, job, monkeypatch):
    _fake(monkeypatch, UploadOutcome(ok=False, message="guidelines"))
    worker.tick()
    assert _row(engine, job).publish_uncertain is False


def test_a_job_changed_during_its_upload_is_not_requeued(engine, job, monkeypatch):
    def cancel_meanwhile(username, video_path, title, options):
        with Session(engine) as s:
            row = s.get(ScheduledUpload, job)
            row.status = "cancelled"
            s.add(row)
            s.commit()
        return UploadOutcome(ok=False, message="network", retryable=True)

    monkeypatch.setattr("api.services.tiktok_adapter.upload_from_options", cancel_meanwhile)
    worker.tick()
    row = _row(engine, job)
    assert row.status == "cancelled" and row.result_text == "network"
    assert worker.tick() is False


def test_existing_databases_get_the_uncertain_column(tmp_path):
    from sqlalchemy import create_engine

    path = tmp_path / "old.db"
    old = create_engine(f"sqlite:///{path}")
    with old.begin() as conn:
        conn.exec_driver_sql(
            "CREATE TABLE scheduled_uploads (id INTEGER PRIMARY KEY, account_id INTEGER, source_type TEXT, "
            "source_ref TEXT, title TEXT, options_json TEXT, scheduled_for TIMESTAMP, status TEXT, "
            "result_text TEXT, attempts INTEGER, heartbeat_at TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP)"
        )
        for i, (status, text) in enumerate([
            ("failed", "the scheduler stopped during this upload; it may or may not have been posted."),
            ("failed", "unexpected error: boom"),
            ("failed", "TikTok rejected the post: guidelines"),
            ("succeeded", "published"),
        ]):
            conn.exec_driver_sql(
                "INSERT INTO scheduled_uploads (id, account_id, source_type, source_ref, title, options_json, "
                "scheduled_for, status, result_text, attempts, created_at, updated_at) "
                f"VALUES ({i + 1}, 1, 'local', 'a.mp4', 't', '{{}}', '2030-01-01', '{status}', '{text}', 1, "
                "'2030-01-01', '2030-01-01')"
            )
    old.dispose()

    eng = api_db.make_engine(f"sqlite:///{path}")
    previous = api_db.engine
    api_db.override_engine(eng)
    try:
        api_db.init_db()
        api_db.init_db()  # idempotent
        with Session(eng) as s:
            flags = [s.get(ScheduledUpload, i).publish_uncertain for i in range(1, 5)]
    finally:
        api_db.override_engine(previous)
        eng.dispose()
    assert flags == [True, True, False, False]


def test_adapter_marks_cut_off_publishes_as_uncertain(monkeypatch):
    from api.services import tiktok_adapter
    from autotok.errors import PublishError, PublishUncertainError

    def client_raising(exc):
        class FakeClient:
            def upload(self, *a, **k):
                raise exc
        return lambda *a, **k: FakeClient()

    cases = [
        (PublishUncertainError("reset"), True),
        (PublishError("rejected"), False),
        (RuntimeError("bug"), True),
    ]
    for exc, uncertain in cases:
        monkeypatch.setattr(tiktok_adapter.Client, "from_account", client_raising(exc))
        outcome = tiktok_adapter.upload_from_options("alice", "v.mp4", "t", {})
        assert outcome.ok is False and outcome.uncertain is uncertain and outcome.retryable is False


def test_a_late_definite_failure_clears_the_stale_flag(engine, job, monkeypatch):
    def reclaimed_meanwhile(username, video_path, title, options):
        with Session(engine) as s:  # the job was marked failed as stale while uploading...
            row = s.get(ScheduledUpload, job)
            row.status = "failed"
            row.publish_uncertain = True
            s.add(row)
            s.commit()
        return UploadOutcome(ok=False, message="TikTok rejected the post")  # ...but nothing was posted

    monkeypatch.setattr("api.services.tiktok_adapter.upload_from_options", reclaimed_meanwhile)
    worker.tick()
    row = _row(engine, job)
    assert row.status == "failed" and row.publish_uncertain is False


def test_migration_tolerates_the_other_container_adding_the_column(tmp_path):
    import sqlite3

    from sqlalchemy import create_engine, event

    path = tmp_path / "race.db"
    old = create_engine(f"sqlite:///{path}")
    with old.begin() as conn:
        conn.exec_driver_sql("CREATE TABLE scheduled_uploads (id INTEGER PRIMARY KEY, status TEXT, result_text TEXT)")
    old.dispose()

    eng = api_db.make_engine(f"sqlite:///{path}")

    @event.listens_for(eng, "before_cursor_execute")
    def other_container_first(conn, cursor, statement, *args):
        if statement.startswith("ALTER TABLE scheduled_uploads"):
            other = sqlite3.connect(path)
            other.execute(statement)
            other.commit()
            other.close()

    api_db._migrate(eng)  # must not raise "duplicate column name"
    with eng.connect() as conn:
        columns = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(scheduled_uploads)")}
    eng.dispose()
    assert "publish_uncertain" in columns


def test_an_interrupted_migration_is_finished_on_the_next_start(tmp_path):
    from sqlalchemy import create_engine

    path = tmp_path / "half.db"
    old = create_engine(f"sqlite:///{path}")
    with old.begin() as conn:  # the column was added, then the process stopped before the backfill
        conn.exec_driver_sql("CREATE TABLE scheduled_uploads (id INTEGER PRIMARY KEY, status TEXT, result_text TEXT, "
                             "publish_uncertain BOOLEAN NOT NULL DEFAULT 0)")
        conn.exec_driver_sql("INSERT INTO scheduled_uploads VALUES (1, 'failed', 'it may or may not have been posted', 0)")
    old.dispose()

    eng = api_db.make_engine(f"sqlite:///{path}")
    api_db._migrate(eng)
    with eng.connect() as conn:
        flag = conn.exec_driver_sql("SELECT publish_uncertain FROM scheduled_uploads WHERE id = 1").scalar()
        version = conn.exec_driver_sql("PRAGMA user_version").scalar()
    eng.dispose()
    assert flag == 1 and version == api_db.SCHEMA_VERSION
