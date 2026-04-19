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
    critical_time_ns = 0
    first_start_ns = None
    total_ns = 0

    for gpu in gpu_events:
        cpu = (
            db.query(CorrelationEvent)
            .filter(CorrelationEvent.session_id == session_id)
            .filter(CorrelationEvent.correlation_id == gpu.correlation_id)
            .first()
        )

        if cpu is None:
            continue

        cpu_time = cpu.cpu_timestamp_ns
        gpu_start = gpu.start_time - offset.offset_ns
        gpu_end = gpu.end_time - offset.offset_ns
        if first_start_ns is None:
            first_start_ns = cpu_time

        path.append({
            "type": "CPU",
            "name": cpu.cpu_function_name or "unknown",
            "start_ns": cpu_time,
            "end_ns": gpu_start,
            "duration_ns": max(0,gpu_start-cpu_time),
        })

        path.append({
            "type": "GPU",
            "name": gpu.name,
            "start_ns": gpu_start,
            "end_ns": gpu_end,
            "duration_ns":max(0,gpu_end - gpu_start)
        })

        critical_time_ns = max(critical_time_ns, gpu_end)
        total_ns=critical_time_ns -(first_start_ns or 0)

    return {
        "session_id": session_id,
        "total_duration_ns": total_ns,
        "total_duration_ms": round(total_ns / 1_000_000, 3),   
        "critical_path_duration_ns": total_ns,
        "critical_path_duration_ms": round(total_ns / 1_000_000, 3), 
        "critical_path_percent": 100.0 if total_ns>0 else 0,
        "path": path,
    }
