from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.gpu_event import GpuEvent
from app.models.session import Session as ProfilingSession
from app.schemas.gpu_event import GpuEventBatch

router = APIRouter(prefix="/sessions", tags=["GPU Events"])

@router.post("/{session_id}/gpu-events")
def ingest_gpu_events(
    session_id: int,
    payload: GpuEventBatch,
    db: Session = Depends(get_db),
):
    session = db.get(ProfilingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    records = [
        GpuEvent(
            session_id=session_id,
            name=item.name,
            start_time=int(item.ts * 1000),
            end_time=int((item.ts + item.dur) * 1000),
            stream_id=item.tid,
            correlation_id=item.args.correlationId if item.args else None,
        )
        for item in payload.events
    ]

    db.bulk_save_objects(records)
    db.commit()

    return {"inserted": len(records)}
