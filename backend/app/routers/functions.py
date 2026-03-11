from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.correlation_event import CorrelationEvent
from app.models.gpu_event import GpuEvent

router = APIRouter(prefix="/sessions", tags=["Functions"])

@router.get("/{session_id}/functions")
def get_function_breakdown(session_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(
            CorrelationEvent.cpu_function_name,
            func.count(GpuEvent.id).label("kernel_count"),
            func.sum(GpuEvent.end_time - GpuEvent.start_time).label("total_gpu_time_ns"),
        )
        .join(GpuEvent, GpuEvent.correlation_id == CorrelationEvent.correlation_id)
        .filter(CorrelationEvent.session_id == session_id)
        .group_by(CorrelationEvent.cpu_function_name)
        .order_by(func.sum(GpuEvent.end_time - GpuEvent.start_time).desc())
        .all()
    )

    return [
        {
            "function_name": row.cpu_function_name or "unknown",
            "kernel_count": row.kernel_count,
            "total_gpu_time_ns": row.total_gpu_time_ns or 0,
            "total_gpu_time_ms": round((row.total_gpu_time_ns or 0) / 1_000_000, 3),
        }
        for row in rows
    ]
