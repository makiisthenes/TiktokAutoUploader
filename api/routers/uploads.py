"""Immediate (synchronous) upload endpoints.

  * POST /api/uploads/file    multipart/form-data with a `video` file + form
    fields. The file is streamed to a temp file, uploaded, then removed.
  * POST /api/uploads/library JSON {name, ...}: a file already in the library.
  * POST /api/uploads/youtube JSON {youtube_url, ...}: downloads, then uploads.

Handlers are plain ``def`` so FastAPI runs them in its threadpool: an upload
takes a while and must not block the event loop (SSE login streams etc.).
Scheduling is NOT handled here — see /api/schedules.
"""
from __future__ import annotations

import os
import shutil
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from api.db import get_session, now_utc
from api.models import Account
from api.schemas import UploadLibraryRequest, UploadOptions, UploadResponse, UploadYouTubeRequest
from api.services import tiktok_adapter, youtube
from api.services import videos as library
from api.services.videos import ALLOWED_SUFFIXES

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


def _require_account(session: Session, username: str) -> Account:
    acct = session.exec(select(Account).where(Account.username == username)).first()
    if not acct:
        raise HTTPException(status_code=404, detail=f"account '{username}' not found")
    if not acct.has_valid_session:
        raise HTTPException(status_code=409, detail=f"account '{username}' has no valid session; re-login required")
    return acct


def _touch_last_used(session: Session, acct: Account) -> None:
    acct.last_used_at = now_utc()
    acct.updated_at = now_utc()
    session.add(acct)
    session.commit()


@router.post("/file", response_model=UploadResponse)
def upload_file(
    username: str = Form(...),
    title: str = Form(..., max_length=2200),
    options_json: str = Form("{}"),
    video: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    acct = _require_account(session, username)
    try:
        options = UploadOptions.model_validate_json(options_json)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"invalid options_json: {e}")

    suffix = os.path.splitext(video.filename or "upload.mp4")[1].lower() or ".mp4"
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=415, detail=f"unsupported file type '{suffix}'")
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as out:
            shutil.copyfileobj(video.file, out, length=1024 * 1024)
        outcome = tiktok_adapter.upload_from_options(username, tmp_path, title, options.model_dump())
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    if outcome.ok:
        _touch_last_used(session, acct)
    return UploadResponse(ok=outcome.ok, message=outcome.message, video_id=outcome.video_id)


@router.post("/youtube", response_model=UploadResponse)
def upload_youtube(
    payload: UploadYouTubeRequest,
    session: Session = Depends(get_session),
):
    acct = _require_account(session, payload.username)
    try:
        video_path = youtube.download(payload.youtube_url)
    except Exception as e:
        return UploadResponse(ok=False, message=f"YouTube download failed: {e}")
    outcome = tiktok_adapter.upload_from_options(
        payload.username, video_path, payload.title, payload.options.model_dump()
    )
    if outcome.ok:
        _touch_last_used(session, acct)
    return UploadResponse(ok=outcome.ok, message=outcome.message, video_id=outcome.video_id)


@router.post("/library", response_model=UploadResponse)
def upload_library(
    payload: UploadLibraryRequest,
    session: Session = Depends(get_session),
):
    acct = _require_account(session, payload.username)
    try:
        path = library.resolve(payload.name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    outcome = tiktok_adapter.upload_from_options(
        payload.username, str(path), payload.title, payload.options.model_dump()
    )
    if outcome.ok:
        _touch_last_used(session, acct)
    return UploadResponse(ok=outcome.ok, message=outcome.message, video_id=outcome.video_id)
