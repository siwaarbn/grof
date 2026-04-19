from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import traceback
import os

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

    # Aggregate duration per function name.
    # M1/T1 eBPF profiler runs at 99 Hz → each sample represents ~10.1 ms of CPU time.
    SAMPLE_INTERVAL_MS = 1000.0 / 99
    cpu_map: dict[str, float] = {}
    for sample, frame in cpu_rows:
        fn_name = frame.function_name if frame else f"stack_{sample.stack_hash or 'unknown'}"
        cpu_map[fn_name] = cpu_map.get(fn_name, 0) + SAMPLE_INTERVAL_MS

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

    # Build flamegraph tree from stacks
    from collections import defaultdict
    stacks = defaultdict(list)
    for sample, frame in cpu_rows:
        fn_name = frame.function_name if frame else (sample.stack_hash or 'unknown')
        key = (sample.timestamp, sample.thread_id)
        stacks[key].append(fn_name)

    import uuid as _uuid
    def add_to_tree(node, frames):
        if not frames:
            return
        name = frames[0]
        for child in node['children']:
            if child['name'] == name:
                child['value'] += 1
                add_to_tree(child, frames[1:])
                return
        new_node = {'id': str(_uuid.uuid4()), 'name': name, 'value': 1, 'children': [], 'relatedGpuEvents': []}
        node['children'].append(new_node)
        add_to_tree(new_node, frames[1:])

    result = {'id': 'root', 'name': 'root', 'value': len(stacks), 'children': [], 'relatedGpuEvents': []}
    for key, frames in stacks.items():
        add_to_tree(result, frames)
    set_cache(cache_key, result)
    return result


# =========================================================
# Session start / stop
# =========================================================
@router.post("/start")
def start(
    name: str = "unnamed",
    db: Session = Depends(get_db),
):
    session = start_session(db, name=name)
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
      ?cpu_file=/path/to/cpu_correlation_with_stack.json  (M2/T1 format)
                /path/to/cpu_samples.json                 (M1/T1 eBPF format)
      ?gpu_file=/path/to/gpu_trace.json                   (M1/T2 format)

    If not provided, auto-detects files in GROF_DATA_DIR, /tmp/grof/, and the repo root.
    Accepts both M1/T1 cpu_samples.json and M2/T1 cpu_correlation_with_stack.json formats.
    """
    # Pass explicit paths into stop_session so it uses them as the first candidates
    # in its search — stop_session starts the ingestion thread itself.
    session = stop_session(db, session_id, cpu_file=cpu_file, gpu_file=gpu_file)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ui_base = os.environ.get("GROF_UI_BASE_URL", "http://localhost:5173")
    dashboard_url = f"{ui_base}/session/{session_id}/correlated"

    return {
        "status": "stopped",
        "session_id": session_id,
        "ingestion": "started with provided files" if (cpu_file or gpu_file) else "auto-detecting files",
        "dashboard_url": dashboard_url,
    }