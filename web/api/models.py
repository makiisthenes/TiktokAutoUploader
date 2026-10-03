"""SQLModel ORM tables. Also serve as the source of truth for the DB schema
that is exposed through OpenAPI (via response_model in the routers).
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from api.db import now_utc


# ---------- accounts ---------------------------------------------------------

class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=128)
    cookie_path: str  # absolute path to tiktok_session-{username}.cookie
    has_valid_session: bool = Field(default=True)
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
    last_used_at: Optional[datetime] = Field(default=None)


# ---------- scheduled uploads -----------------------------------------------

class ScheduledUpload(SQLModel, table=True):
    __tablename__ = "scheduled_uploads"

    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="accounts.id", index=True)

    # 'local' = source_ref is an absolute file path on the shared volume.
    # 'youtube' = source_ref is a YouTube URL that the worker will resolve
    # via yt-dlp at run time.
    source_type: str = Field(max_length=16)
    source_ref: str
    title: str = Field(max_length=2200)

    # Mirror of CLI upload flags so the worker can call upload_video with the
    # same signature. Stored as a JSON string for schema simplicity.
    options_json: str = Field(default="{}")

    scheduled_for: datetime = Field(index=True)

    # pending → running → succeeded|failed|cancelled
    status: str = Field(default="pending", index=True, max_length=16)

    result_text: Optional[str] = Field(default=None)
    attempts: int = Field(default=0)
    heartbeat_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


# ---------- noVNC login sessions --------------------------------------------

class LoginSession(SQLModel, table=True):
    __tablename__ = "login_sessions"

    id: str = Field(primary_key=True, max_length=64)  # uuid
    username: str = Field(index=True, max_length=128)
    # pending → active → completed|failed|expired
    status: str = Field(default="pending", max_length=16)
    vnc_url: Optional[str] = Field(default=None)
    error: Optional[str] = Field(default=None)

    started_at: datetime = Field(default_factory=now_utc)
    completed_at: Optional[datetime] = Field(default=None)
