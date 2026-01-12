from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session_time_offset import SessionTimeOffset

router = APIRouter(prefix="/sessions", tags=["Time Sync"])


@router.post("/{session_id}/time-sync")
def ingest_time_sync(
    session_id: int,
    cpu_sync_timestamp_ns: int,
    gpu_sync_timestamp_ns: int,
    db: Session = Depends(get_db),
):
    offset_ns = gpu_sync_timestamp_ns - cpu_sync_timestamp_ns

    record = SessionTimeOffset(
        session_id=session_id,
        cpu_sync_timestamp_ns=cpu_sync_timestamp_ns,
        gpu_sync_timestamp_ns=gpu_sync_timestamp_ns,
        offset_ns=offset_ns,
    )

    db.add(record)
    db.commit()

    return {
        "session_id": session_id,
        "offset_ns": offset_ns,
    }
