from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.correlation_event import CorrelationEvent
from app.models.gpu_event import GpuEvent
from app.models.cpu_sample import CpuSample
from app.models.stack_frame import StackFrame

# M1/T1 eBPF profiler runs at 99 Hz — each sample row = this many ms of CPU time.
SAMPLE_INTERVAL_MS = 1000.0 / 99

router = APIRouter(prefix="/sessions", tags=["Functions"])

@router.get("/{session_id}/functions")
def get_function_breakdown(session_id: int, db: Session = Depends(get_db)):
    # ── GPU time per function (via correlation join) ────────────────────────
    gpu_rows = (
        db.query(
            CorrelationEvent.cpu_function_name,
            func.count(GpuEvent.id).label("kernel_count"),
            func.sum(GpuEvent.end_time - GpuEvent.start_time).label("total_gpu_time_ns"),
        )
        .join(GpuEvent, GpuEvent.correlation_id == CorrelationEvent.correlation_id)
        .filter(CorrelationEvent.session_id == session_id)
        .group_by(CorrelationEvent.cpu_function_name)
        .all()
    )

    # ── CPU time per function (from M1/T1 eBPF samples) ────────────────────
    cpu_rows = (
        db.query(
            StackFrame.function_name,
            func.count(CpuSample.id).label("sample_count"),
        )
        .join(CpuSample, CpuSample.stack_hash == StackFrame.hash)
        .filter(CpuSample.session_id == session_id)
        .group_by(StackFrame.function_name)
        .all()
    )
    cpu_times = {
        row.function_name: round(row.sample_count * SAMPLE_INTERVAL_MS, 3)
        for row in cpu_rows
    }

    # ── Merge: all functions that appear in either GPU or CPU data ──────────
    merged: dict[str, dict] = {}

    for row in gpu_rows:
        name = row.cpu_function_name or "unknown"
        merged[name] = {
            "function_name": name,
            "kernel_count": row.kernel_count,
            "total_gpu_time_ns": row.total_gpu_time_ns or 0,
            "total_gpu_time_ms": round((row.total_gpu_time_ns or 0) / 1_000_000, 3),
            "total_cpu_time_ms": cpu_times.get(name, 0.0),
        }

    for fn_name, cpu_ms in cpu_times.items():
        if fn_name not in merged:
            merged[fn_name] = {
                "function_name": fn_name,
                "kernel_count": 0,
                "total_gpu_time_ns": 0,
                "total_gpu_time_ms": 0.0,
                "total_cpu_time_ms": cpu_ms,
            }

    return sorted(merged.values(), key=lambda x: x["total_gpu_time_ms"], reverse=True)
