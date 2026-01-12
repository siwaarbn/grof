from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.correlation_event import CorrelationEvent
from app.models.gpu_event import GpuEvent
from app.models.session_time_offset import SessionTimeOffset

router = APIRouter(prefix="/sessions", tags=["Critical Path"])


@router.get("/{session_id}/critical-path")
def get_critical_path(
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
        return {"error": "No time sync data"}

    # 2. Load correlated GPU events
    gpu_events = (
        db.query(GpuEvent)
        .filter(GpuEvent.session_id == session_id)
        .filter(GpuEvent.correlation_id.isnot(None))
        .order_by(GpuEvent.start_time)
        .all()
    )

    path = []
    critical_time = 0

    for gpu in gpu_events:
        cpu = (
            db.query(CorrelationEvent)
            .filter(CorrelationEvent.session_id == session_id)
            .filter(CorrelationEvent.correlation_id == gpu.correlation_id)
            .first()
        )

        if cpu is None:
            continue

        cpu_time = cpu.cpu_timestamp
        gpu_start = gpu.start_time - offset.offset_ns
        gpu_end = gpu.end_time - offset.offset_ns

        path.append({
            "type": "CPU",
            "name": cpu.function_name,
            "start_ns": cpu_time,
            "end_ns": gpu_start,
        })

        path.append({
            "type": "GPU",
            "name": gpu.name,
            "start_ns": gpu_start,
            "end_ns": gpu_end,
        })

        critical_time = max(critical_time, gpu_end)

    return {
        "critical_path_ns": critical_time,
        "path": path,
    }
