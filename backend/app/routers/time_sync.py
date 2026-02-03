# app/routers/time_sync.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session_time_offset import SessionTimeOffset
from app.schemas.time_sync import TimeSyncIn

router = APIRouter(prefix="/sessions", tags=["Time Sync"])


@router.post("/{session_id}/time-sync")
def ingest_time_sync(
    session_id: int,
    payload: TimeSyncIn,
    db: Session = Depends(get_db),
):
    
    existing = (
        db.query(SessionTimeOffset)
        .filter(SessionTimeOffset.session_id == session_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Time sync already exists for this session",
        )

    offset_ns = payload.gpu_sync_timestamp_ns - payload.cpu_sync_timestamp_ns

    record = SessionTimeOffset(
        session_id=session_id,
        cpu_sync_timestamp_ns=payload.cpu_sync_timestamp_ns,
        gpu_sync_timestamp_ns=payload.gpu_sync_timestamp_ns,
        offset_ns=offset_ns,
    )

    db.add(record)
    db.commit()

    return {
        "session_id": session_id,
        "offset_ns": offset_ns,
    }
