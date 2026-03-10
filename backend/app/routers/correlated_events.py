from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.correlation_event import CorrelationEvent
from app.models.gpu_event import GpuEvent
from app.models.session_time_offset import SessionTimeOffset

router = APIRouter(prefix="/sessions", tags=["Correlation"])


@router.get("/{session_id}/correlated-events")
def get_correlated_events(
    session_id: int,
    db: Session = Depends(get_db),
):
    # 1. Load time offset
    offset = (
        db.query(SessionTimeOffset)
        .filter(SessionTimeOffset.session_id == session_id)
        .first()
    )

    if offset is None:
        return {"error": "No time sync data for this session"}

    # 2. Load GPU events with correlation IDs
    gpu_events = (
        db.query(GpuEvent)
        .filter(GpuEvent.session_id == session_id)
        .filter(GpuEvent.correlation_id.isnot(None))
        .all()
    )

    results = []

    for gpu in gpu_events:
        # 3. Find matching CPU event
        cpu = (
            db.query(CorrelationEvent)
            .filter(CorrelationEvent.session_id == session_id)
            .filter(CorrelationEvent.correlation_id == gpu.correlation_id)
            .first()
        )

        if cpu is None:
            continue

        # 4. Align timestamps
        results.append({
            "cpu_function": cpu.cpu_function_name,
            "cpu_timestamp_ns": cpu.cpu_timestamp_ns ,
            "gpu_kernel": gpu.name,
            "gpu_start_ns": gpu.start_time - offset.offset_ns,
            "gpu_end_ns": gpu.end_time - offset.offset_ns,
        })

    return results
