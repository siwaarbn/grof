from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.cpu_sample import CpuSampleBatch
from app.database import get_db
from app.models.cpu_sample import CpuSample
import hashlib

from datetime import datetime
from fastapi import HTTPException
from app.models.session import Session as ProfilingSession




router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok"}

def compute_stack_hash(stack: list[str]) -> str:
    joined = ";".join(stack)
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()


@router.post("/sessions/{session_id}/cpu-samples")
def ingest_cpu_samples(
    session_id: int,
    payload: CpuSampleBatch,
    db: Session = Depends(get_db)
):
    for sample in payload.samples:
        cpu_sample = CpuSample(
            session_id=session_id,
            timestamp=int(sample.timestamp * 1_000_000_000),
            thread_id=sample.thread_id,
            stack_hash=compute_stack_hash(sample.stack)

        )
        db.add(cpu_sample)

    db.commit()

    return {
        "session_id": session_id,
        "inserted_samples": len(payload.samples)
    }

@router.get("/sessions/{session_id}/cpu-samples")
def list_cpu_samples(
    session_id: int,
    db: Session = Depends(get_db)
):
    samples = (
        db.query(CpuSample)
        .filter(CpuSample.session_id == session_id)
        .all()
    )

    return {
        "session_id": session_id,
        "count": len(samples),
        "samples": [
            {
                "id": s.id,
                "timestamp": s.timestamp,
                "thread_id": s.thread_id,
                "stack_hash": s.stack_hash,
            }
            for s in samples
        ]
    }
