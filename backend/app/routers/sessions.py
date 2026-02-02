from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import traceback

from app.database import get_db
from app.models.session import Session as ProfilingSession
from app.models.cpu_sample import CpuSample
from app.schemas.cpu_sample import CpuSampleBatch
from app.services.session_services  import start_session, stop_session


# ✅ Router FIRST
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


