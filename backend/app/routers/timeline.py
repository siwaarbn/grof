from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.gpu_event import GpuEvent
from app.models.correlation_event import CorrelationEvent

router = APIRouter(prefix="/sessions", tags=["Timeline"])

@router.get("/{session_id}/timeline")
def get_timeline(
    session_id: int,
    start: int = Query(..., description="Start timestamp in nanoseconds"),
    end: int = Query(..., description="End timestamp in nanoseconds"),
    db: Session = Depends(get_db),
):
    gpu_events = (
        db.query(GpuEvent)
        .filter(GpuEvent.session_id == session_id)
        .filter(GpuEvent.start_time >= start)
        .filter(GpuEvent.end_time <= end)
        .order_by(GpuEvent.start_time)
        .all()
    )

    cpu_events = (
        db.query(CorrelationEvent)
        .filter(CorrelationEvent.session_id == session_id)
        .filter(CorrelationEvent.cpu_timestamp_ns >= start)
        .filter(CorrelationEvent.cpu_timestamp_ns <= end)
        .order_by(CorrelationEvent.cpu_timestamp_ns)
        .all()
    )

    return {
        "session_id": session_id,
        "start_ns": start,
        "end_ns": end,
        "gpu_events": [
            {
                "id": e.id,
                "name": e.name,
                "start_ns": e.start_time,
                "end_ns": e.end_time,
                "duration_ns": e.end_time - e.start_time,
                "stream_id": e.stream_id,
                "correlation_id": e.correlation_id,
            }
            for e in gpu_events
        ],
        "cpu_events": [
            {
                "id": e.id,
                "function_name": e.cpu_function_name,
                "timestamp_ns": e.cpu_timestamp_ns,
                "correlation_id": e.correlation_id,
            }
            for e in cpu_events
        ],
    }
