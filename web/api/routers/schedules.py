"""CRUD over scheduled_uploads.

Create inserts a 'pending' row; the scheduler container picks it up when its
scheduled_for is due. Update only allows safe transitions (cancel, reschedule
forward). Delete is soft via status=cancelled, except for terminal rows where
it hard-deletes.
"""
from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from api.db import get_session, now_utc
from api.models import Account, ScheduledUpload
from api.schemas import (
    ScheduledUploadCreate,
    ScheduledUploadRead,
    ScheduledUploadUpdate,
)
from api.services import videos as library

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=List[ScheduledUploadRead])
def list_schedules(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    session: Session = Depends(get_session),
):
    q = select(ScheduledUpload).order_by(ScheduledUpload.scheduled_for)
    if status_filter:
        q = q.where(ScheduledUpload.status == status_filter)
    return session.exec(q).all()


@router.get("/{schedule_id}", response_model=ScheduledUploadRead)
def get_schedule(schedule_id: int, session: Session = Depends(get_session)):
    row = session.get(ScheduledUpload, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="schedule not found")
    return row


@router.post("", response_model=ScheduledUploadRead, status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: ScheduledUploadCreate,
    session: Session = Depends(get_session),
):
    acct = session.exec(select(Account).where(Account.username == payload.username)).first()
    if not acct:
        raise HTTPException(status_code=404, detail=f"account '{payload.username}' not found")

    source_ref = payload.source_ref
    if payload.source_type == "local":
        # Only files in the video library can be scheduled; store the name so
        # the row stays valid if the volume is mounted somewhere else.
        try:
            source_ref = library.resolve(payload.source_ref).name
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    row = ScheduledUpload(
        account_id=acct.id,
        source_type=payload.source_type,
        source_ref=source_ref,
        title=payload.title,
        options_json=json.dumps(payload.options.model_dump()),
        scheduled_for=payload.scheduled_for,
        status="pending",
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.patch("/{schedule_id}", response_model=ScheduledUploadRead)
def update_schedule(
    schedule_id: int,
    payload: ScheduledUploadUpdate,
    session: Session = Depends(get_session),
):
    row = session.get(ScheduledUpload, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="schedule not found")
    if row.status not in ("pending", "failed"):
        # Running, succeeded, cancelled rows are terminal from a CRUD perspective.
        raise HTTPException(status_code=409, detail=f"cannot modify row in status '{row.status}'")

    if payload.scheduled_for is not None:
        row.scheduled_for = payload.scheduled_for
    if payload.title is not None:
        row.title = payload.title
    if payload.status is not None:
        # Only two safe transitions: pending→cancelled, failed→pending (retry)
        if payload.status == "cancelled" and row.status in ("pending", "failed"):
            row.status = "cancelled"
        elif payload.status == "pending" and row.status == "failed":
            row.status = "pending"
            row.result_text = None
        else:
            raise HTTPException(
                status_code=409,
                detail=f"invalid transition {row.status}→{payload.status}",
            )
    row.updated_at = now_utc()
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, session: Session = Depends(get_session)):
    row = session.get(ScheduledUpload, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="schedule not found")
    if row.status == "running":
        raise HTTPException(status_code=409, detail="cannot delete a running job; wait for it to finish")
    session.delete(row)
    session.commit()
