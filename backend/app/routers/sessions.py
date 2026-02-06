from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import traceback
from sqlalchemy import func
from app.database import get_db
from app.models.session import Session as ProfilingSession
from app.models.cpu_sample import CpuSample
from app.schemas.cpu_sample import CpuSampleBatch
from app.services.session_services  import start_session, stop_session
from app.models.gpu_event import GpuEvent
from app.models.correlation_event import CorrelationEvent
from app.models.stack_frame import StackFrame




router = APIRouter(prefix="/sessions", tags=["Sessions"])


# =========================================================
# List sessions
# =========================================================
@router.get("")
def list_sessions(db: Session = Depends(get_db)):
    try:
        sessions = db.query(ProfilingSession).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "git_commit_hash": s.git_commit_hash,
                "tags": s.tags,
            }
            for s in sessions
        ]
    except Exception as e:
        print("🔥 ERROR IN /sessions")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# CPU samples ingestion (Week 3)
# =========================================================
@router.post("/{session_id}/cpu-samples")
def ingest_cpu_samples(
    session_id: int,
    batch: CpuSampleBatch,
    db: Session = Depends(get_db),
):
    objects = [
        CpuSample(
            session_id=session_id,
            timestamp=s.timestamp,
            thread_id=s.thread_id,
            stack_hash=s.stack_hash,
        )
        for s in batch.samples
    ]

    db.bulk_save_objects(objects)
    db.commit()

    return {"inserted": len(objects)}


# =========================================================
# Flamegraph aggregation (stub for now)
# =========================================================
@router.get("/{session_id}/flamegraph")
def get_flamegraph(
    session_id: int,
    db: Session = Depends(get_db),
):
    samples = (
        db.query(CpuSample)
        .filter(CpuSample.session_id == session_id)
        .all()
    )

    root = {
        "name": "root",
        "value": 0,
        "children": {}
    }

    for s in samples:
        root["value"] += 1

        stack_name = f"stack_{s.stack_hash}"

        if stack_name not in root["children"]:
            root["children"][stack_name] = {
                "name": stack_name,
                "value": 0,
                "children": {}
            }

        root["children"][stack_name]["value"] += 1

    # convert children dicts to lists (IMPORTANT)
    def normalize(node):
        return {
            "name": node["name"],
            "value": node["value"],
            "children": [
                normalize(child)
                for child in node["children"].values()
            ]
        }

    return normalize(root)

@router.post("/start")
def start(db: Session = Depends(get_db)):
    session = start_session(db)
    return {"session_id": session.id}


@router.post("/stop/{session_id}")
def stop(session_id: int, db: Session = Depends(get_db)):
    session = stop_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "stopped"}
 
@router.get("/{session_id}/functions")
def function_level_breakdown(
    session_id: int,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            StackFrame.function_name.label("function"),
            func.count(GpuEvent.id).label("kernel_count"),
            func.sum(GpuEvent.end_time_ns - GpuEvent.start_time_ns)
                .label("total_gpu_time_ns"),
        )
        .join(
            CorrelationEvent,
            CorrelationEvent.correlation_id == GpuEvent.correlation_id,
        )
        .join(
            StackFrame,
            StackFrame.hash == CorrelationEvent.cpu_stack_hash,
        )
        .filter(GpuEvent.session_id == session_id)
        .group_by(StackFrame.function_name)
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="No correlated data found")

    return {
        r.function: {
            "kernel_count": r.kernel_count,
            "total_gpu_time_ms": round(r.total_gpu_time_ns / 1e6, 3),
        }
        for r in rows
    }


@router.get("/{session_id}/timeline")
def get_timeline(
    session_id: int,
    start_ns: int,
    end_ns: int,
    db: Session = Depends(get_db),
):
    if start_ns >= end_ns:
        raise HTTPException(
            status_code=400,
            detail="Invalid time range",
        )

    # 1. Load time offset (CPU ↔ GPU sync)
    offset = (
        db.query(SessionTimeOffset)
        .filter(SessionTimeOffset.session_id == session_id)
        .first()
    )

    if offset is None:
        raise HTTPException(
            status_code=404,
            detail="No time sync data for this session",
        )

    # 2. Load correlated GPU events in range
    rows = (
        db.query(
            GpuEvent,
            StackFrame.function_name,
        )
        .join(
            CorrelationEvent,
            CorrelationEvent.correlation_id == GpuEvent.correlation_id,
        )
        .join(
            StackFrame,
            StackFrame.hash == CorrelationEvent.cpu_stack_hash,
        )
        .filter(GpuEvent.session_id == session_id)
        .filter(GpuEvent.start_time >= start_ns + offset.offset_ns)
        .filter(GpuEvent.end_time <= end_ns + offset.offset_ns)
        .order_by(GpuEvent.start_time)
        .all()
    )

    # 3. Build response
    events = []
    for gpu, function_name in rows:
        gpu_start = gpu.start_time - offset.offset_ns
        gpu_end = gpu.end_time - offset.offset_ns

        events.append({
            "type": "GPU",
            "kernel": gpu.name,
            "cpu_function": function_name,
            "start_ns": gpu_start,
            "end_ns": gpu_end,
            "duration_ms": round(
                (gpu_end - gpu_start) / 1e6, 3
            ),
            "correlation_id": gpu.correlation_id,
        })

    return {
        "session_id": session_id,
        "start_ns": start_ns,
        "end_ns": end_ns,
        "events": events,
    }
