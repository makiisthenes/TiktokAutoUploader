"""SQLite engine + session factory.

One engine per process. WAL mode is set on every new connection so the api
service and scheduler service can read/write the same file concurrently without
sharing a connection. Time comparisons against `scheduled_for` happen in
Python (`datetime.now(timezone.utc)`) — not SQL — so container TZ drift can't
silently break the scheduler.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Iterator

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, SQLModel, create_engine


def _db_path() -> str:
    """Resolve the SQLite file path. Defaults to /data/tiktok.db (the shared
    Docker volume mount) but falls back to a repo-local ./data/tiktok.db so
    tests and local CLI usage work without Docker."""
    env = os.getenv("TIKTOK_API_DB_PATH")
    if env:
        return env
    if os.path.isdir("/data"):
        return "/data/tiktok.db"
    local = os.path.join(os.getcwd(), "data")
    os.makedirs(local, exist_ok=True)
    return os.path.join(local, "tiktok.db")


def make_engine(url: str | None = None) -> Engine:
    if url is None:
        url = f"sqlite:///{_db_path()}"
    # check_same_thread=False — FastAPI runs handlers in a threadpool; each
    # request still gets its own Session so there's no shared-connection bug.
    eng = create_engine(
        url,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(eng, "connect")
    def _set_pragmas(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute("PRAGMA synchronous=NORMAL;")
        cur.execute("PRAGMA busy_timeout=5000;")
        cur.execute("PRAGMA foreign_keys=ON;")
        cur.close()

    return eng


# Module-level engine; overridden in tests via `override_engine`.
engine: Engine = make_engine()


def override_engine(new_engine: Engine) -> None:
    """Swap the module-level engine. Used only by the test fixture."""
    global engine
    engine = new_engine


def init_db() -> None:
    """Create tables if they don't exist. Idempotent."""
    # Import models so SQLModel.metadata sees them.
    from api import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    _migrate(engine)


# Stored in SQLite's PRAGMA user_version once every step of _migrate has finished.
SCHEMA_VERSION = 1


def _migrate(eng: Engine) -> None:
    """Bring databases created by older versions up to date.

    ``create_all`` creates missing tables but never alters existing ones. Every step here is
    safe to repeat, and ``user_version`` is only set at the end, so a migration interrupted
    half way is finished on the next start. The api and scheduler containers both run this at
    startup on the same database, so the other one may get to a step first."""
    with eng.begin() as conn:
        if conn.exec_driver_sql("PRAGMA user_version").scalar() >= SCHEMA_VERSION:
            return
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(scheduled_uploads)")}
        if "publish_uncertain" not in columns:
            try:
                conn.exec_driver_sql(
                    "ALTER TABLE scheduled_uploads ADD COLUMN publish_uncertain BOOLEAN NOT NULL DEFAULT 0"
                )
            except OperationalError as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise
                # The other container added it at the same moment.
        # Jobs that failed this way before the column existed.
        conn.exec_driver_sql(
            "UPDATE scheduled_uploads SET publish_uncertain = 1 WHERE status = 'failed' AND "
            "(result_text LIKE '%may or may not%' OR result_text LIKE 'unexpected error:%')"
        )
        conn.exec_driver_sql(f"PRAGMA user_version = {SCHEMA_VERSION}")


def get_session() -> Iterator[Session]:
    """FastAPI dependency. One short-lived session per request."""
    with Session(engine) as session:
        yield session


def now_utc() -> datetime:
    """Single source of truth for 'now' across the API and scheduler."""
    return datetime.now(timezone.utc)
