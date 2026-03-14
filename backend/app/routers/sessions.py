from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import traceback

from app.database import get_db
from app.models.session import Session as ProfilingSession
from app.models.cpu_sample import CpuSample
from app.models.gpu_event import GpuEvent
from app.models.stack_frame import StackFrame
from app.schemas.cpu_sample import CpuSampleBatch
from app.services.session_services import start_session, stop_session


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
        print("ERROR IN GET /sessions")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# GET single session — with real cpu_samples + gpu_events
# =========================================================
@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.get(ProfilingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── CPU samples: join with stack_frames to get function names ──────────
    cpu_rows = (
        db.query(CpuSample, StackFrame)
        .outerjoin(StackFrame, CpuSample.stack_hash == StackFrame.hash)
        .filter(CpuSample.session_id == session_id)
        .all()
    )

    # Aggregate duration per function name (each sample = 1ms by convention)
    cpu_map: dict[str, float] = {}
    for sample, frame in cpu_rows:
        fn_name = frame.function_name if frame else f"stack_{sample.stack_hash or 'unknown'}"
        cpu_map[fn_name] = cpu_map.get(fn_name, 0) + 1.0  # 1ms per sample

    cpu_samples = [
        {"function_name": name, "duration_ms": total_ms}
        for name, total_ms in cpu_map.items()
    ]

    # ── GPU events ─────────────────────────────────────────────────────────
    gpu_rows = (
        db.query(GpuEvent)
        .filter(GpuEvent.session_id == session_id)
        .order_by(GpuEvent.start_time)
        .all()
    )

    gpu_events = []
    for e in gpu_rows:
        duration_ms = max(0.0, (e.end_time - e.start_time) / 1e6)
        if e.name and e.name.lower() in ("memcpy", "cudamemcpy", "memcpyhtod", "memcpydtoh"):
            gpu_events.append({"type": "memcpy", "duration_ms": duration_ms})
        else:
            gpu_events.append({
                "type": "kernel",
                "kernel_name": e.name or "unknown_kernel",
                "duration_ms": duration_ms,
            })

    return {
        "id": str(session.id),
        "start_time": session.start_time,
        "end_time": session.end_time,
        "cpu_samples": cpu_samples,
        "gpu_events": gpu_events,
    }


# =========================================================
# CPU samples ingestion
# =========================================================
@router.post("/{session_id}/cpu-samples")
def ingest_cpu_samples(
    session_id: int,
    batch: CpuSampleBatch,
    db: Session = Depends(get_db),
):
    from app.core.cache import invalidate_cache

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
    invalidate_cache(f"flamegraph:{session_id}")
    return {"inserted": len(objects)}


# =========================================================
# Flamegraph — built from real cpu_samples + stack_frames
# =========================================================
@router.get("/{session_id}/flamegraph")
def get_flamegraph(
    session_id: int,
    db: Session = Depends(get_db),
):
    from app.core.cache import get_cache, set_cache

    cache_key = f"flamegraph:{session_id}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    cpu_rows = (
        db.query(CpuSample, StackFrame)
        .outerjoin(StackFrame, CpuSample.stack_hash == StackFrame.hash)
        .filter(CpuSample.session_id == session_id)
        .all()
    )

    if not cpu_rows:
        return {"name": "root", "value": 0, "children": []}

    # Aggregate by function name
    fn_counts: dict[str, int] = {}
    for sample, frame in cpu_rows:
        fn_name = frame.function_name if frame else f"stack_{sample.stack_hash or 'unknown'}"
        fn_counts[fn_name] = fn_counts.get(fn_name, 0) + 1

    total = sum(fn_counts.values())
    children = [
        {"name": name, "value": count, "children": []}
        for name, count in sorted(fn_counts.items(), key=lambda x: -x[1])
    ]

    result = {"name": "root", "value": total, "children": children}
    set_cache(cache_key, result)
    return result


# =========================================================
# Session start / stop
# =========================================================
@router.post("/start")
def start(db: Session = Depends(get_db)):
    session = start_session(db)
    return {"session_id": session.id}


@router.post("/stop/{session_id}")
def stop(
    session_id: int,
    db: Session = Depends(get_db),
    cpu_file: str = None,
    gpu_file: str = None,
):
    """
    Stop a session and automatically ingest profiling data.

    Optional query params:
      ?cpu_file=/path/to/cpu_correlation_with_stack.json
      ?gpu_file=/path/to/gpu_trace.json

    If not provided, the backend auto-detects files in /tmp/grof/ and the repo root.
    """
    import threading
    from app.services.session_services import _run_ingest

    session = stop_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # If explicit paths given, override auto-detection
    if cpu_file or gpu_file:
        thread = threading.Thread(
            target=_run_ingest,
            args=(session_id, cpu_file, gpu_file),
            daemon=True,
        )
        thread.start()
        return {"status": "stopped", "ingestion": "started with provided files"}

    return {"status": "stopped", "ingestion": "auto-detecting files"}
