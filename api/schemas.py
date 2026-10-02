"""Pydantic request/response schemas — separate from SQLModel tables so we can
validate input (e.g. reject past scheduled_for, reject non-YouTube URLs) without
polluting the ORM layer. These schemas are what appears in `/docs`.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from autotok.errors import ValidationError as AutotokValidationError
from autotok.proxy import parse_proxy
from autotok.youtube import is_youtube_url

USERNAME_PATTERN = r"^[A-Za-z0-9_.\-]+$"


def _validate_proxy(v: Optional[str]) -> Optional[str]:
    """Normalise a proxy string to its URL form; '' means "no proxy"."""
    if v is None:
        return None
    if not v.strip():
        return ""
    try:
        return parse_proxy(v).url
    except AutotokValidationError as e:
        raise ValueError(str(e)) from None


# ---------- accounts ---------------------------------------------------------

class AccountRead(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    cookie_path: str
    has_valid_session: bool
    proxy: Optional[str] = None  # masked: http://user:****@host:port
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AccountCreate(BaseModel):
    # Register an existing session file (produced by `autotok login` or a
    # previous browser login) against a username. This endpoint does not log in.
    username: str = Field(min_length=1, max_length=128, pattern=USERNAME_PATTERN)
    display_name: Optional[str] = Field(default=None, max_length=128)


class AccountUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=128)
    # Full proxy URL to set, "" to clear, omitted to leave unchanged.
    proxy: Optional[str] = None

    @field_validator("proxy")
    @classmethod
    def _check_proxy(cls, v: Optional[str]) -> Optional[str]:
        return _validate_proxy(v)


class SessionCheckResponse(BaseModel):
    valid: bool


# ---------- proxies ----------------------------------------------------------

class ProxyTestRequest(BaseModel):
    proxy: Optional[str] = None  # test this proxy...
    account_id: Optional[int] = None  # ...or this account's saved proxy

    @field_validator("proxy")
    @classmethod
    def _check_proxy(cls, v: Optional[str]) -> Optional[str]:
        return _validate_proxy(v) or None


class ProxyTestResponse(BaseModel):
    ok: bool
    proxy: Optional[str]  # masked
    ip: Optional[str] = None
    error: Optional[str] = None


# ---------- uploads (immediate) ---------------------------------------------

class UploadOptions(BaseModel):
    """Mirrors the CLI upload flags. All optional with sensible defaults."""
    allow_comment: Literal[0, 1] = 1
    allow_duet: Literal[0, 1] = 0
    allow_stitch: Literal[0, 1] = 0
    visibility_type: Literal[0, 1] = 0  # 0=public, 1=private
    ai_label: Literal[0, 1] = 0
    # Per-upload override; empty means "use the account's saved proxy".
    proxy: str = ""

    @field_validator("proxy")
    @classmethod
    def _check_proxy(cls, v: str) -> str:
        return _validate_proxy(v) or ""


class UploadYouTubeRequest(BaseModel):
    username: str
    title: str = Field(min_length=1, max_length=2200)
    youtube_url: str
    options: UploadOptions = Field(default_factory=UploadOptions)

    @field_validator("youtube_url")
    @classmethod
    def _youtube(cls, v: str) -> str:
        if not is_youtube_url(v):
            raise ValueError("youtube_url must be a valid YouTube URL")
        return v


class UploadLibraryRequest(BaseModel):
    username: str
    title: str = Field(min_length=1, max_length=2200)
    name: str  # file name in the video library
    options: UploadOptions = Field(default_factory=UploadOptions)


class UploadResponse(BaseModel):
    ok: bool
    message: str
    video_id: Optional[str] = None


# ---------- schedules --------------------------------------------------------

class ScheduledUploadCreate(BaseModel):
    username: str
    title: str = Field(min_length=1, max_length=2200)
    source_type: Literal["local", "youtube"]
    source_ref: str  # file name in the video library (local) or YouTube URL
    scheduled_for: datetime  # ISO-8601; must have tzinfo
    options: UploadOptions = Field(default_factory=UploadOptions)

    @model_validator(mode="after")
    def _validate(self) -> "ScheduledUploadCreate":
        if self.scheduled_for.tzinfo is None:
            raise ValueError("scheduled_for must include timezone info")
        if self.scheduled_for <= datetime.now(timezone.utc):
            raise ValueError("scheduled_for must be in the future")
        if self.source_type == "youtube" and not is_youtube_url(self.source_ref):
            raise ValueError("source_ref must be a valid YouTube URL when source_type='youtube'")
        return self


class ScheduledUploadUpdate(BaseModel):
    scheduled_for: Optional[datetime] = None
    title: Optional[str] = Field(default=None, max_length=2200)
    status: Optional[Literal["pending", "cancelled"]] = None  # only safe transitions

    @model_validator(mode="after")
    def _validate(self) -> "ScheduledUploadUpdate":
        if self.scheduled_for is not None:
            if self.scheduled_for.tzinfo is None:
                raise ValueError("scheduled_for must include timezone info")
            if self.scheduled_for <= datetime.now(timezone.utc):
                raise ValueError("scheduled_for must be in the future")
        return self


class ScheduledUploadRead(BaseModel):
    id: int
    account_id: int
    source_type: str
    source_ref: str
    title: str
    options_json: str
    scheduled_for: datetime
    status: str
    result_text: Optional[str]
    attempts: int
    heartbeat_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- videos / browse --------------------------------------------------

class VideoFileInfo(BaseModel):
    name: str
    size_bytes: int
    modified_at: datetime


# ---------- login (noVNC) ----------------------------------------------------

class LoginBrowserStartRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128, pattern=USERNAME_PATTERN)
    # Proxy for this account: used by the login browser and saved for uploads.
    proxy: Optional[str] = None

    @field_validator("proxy")
    @classmethod
    def _check_proxy(cls, v: Optional[str]) -> Optional[str]:
        return _validate_proxy(v) or None


class LoginBrowserStartResponse(BaseModel):
    session_id: str
    vnc_url: str


class LoginBrowserCompleteRequest(BaseModel):
    """Payload the noVNC control server POSTs back to the API when it detects
    the session cookies. The API is responsible for saving the account and
    updating the account row — noVNC stays stateless."""
    cookies: list[dict]
    user_agent: Optional[str] = None
    proxy: Optional[str] = None


class LoginSessionRead(BaseModel):
    id: str
    username: str
    status: str
    vnc_url: Optional[str]
    error: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}
