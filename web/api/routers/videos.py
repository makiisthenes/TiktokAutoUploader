"""The video library on the shared volume (``AUTOTOK_VIDEOS_DIR``).

Files added here can be scheduled as local uploads by name.
"""
from __future__ import annotations

import shutil
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from api.schemas import VideoFileInfo
from api.services import videos as library

router = APIRouter(prefix="/api/videos", tags=["videos"])


def _info(path) -> VideoFileInfo:
    st = path.stat()
    return VideoFileInfo(
        name=path.name,
        size_bytes=st.st_size,
        modified_at=datetime.fromtimestamp(st.st_mtime, tz=timezone.utc),
    )


@router.get("", response_model=List[VideoFileInfo])
def list_videos():
    d = library.library_dir()
    return [_info(p) for p in sorted(d.iterdir()) if p.is_file() and not p.name.startswith(".")]


@router.post("", response_model=VideoFileInfo, status_code=status.HTTP_201_CREATED)
def add_video(video: UploadFile = File(...)):
    """Save an uploaded file into the library (streamed to disk)."""
    try:
        name = library.safe_filename(video.filename or "")
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    dest = library.library_dir() / name
    partial = dest.with_name(f".{name}.part")
    try:
        with open(partial, "wb") as out:
            shutil.copyfileobj(video.file, out, length=1024 * 1024)
        partial.replace(dest)
    finally:
        if partial.exists():
            partial.unlink()
    return _info(dest)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(name: str):
    try:
        path = library.resolve(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    path.unlink()
