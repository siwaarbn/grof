from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db


from app.schemas.cpu_correlation import CpuCorrelationBatch
from app.models.correlation_event import CorrelationEvent

router = APIRouter(prefix="/sessions", tags=["CPU Correlation"])


@router.post("/{session_id}/cpu-correlation")
def ingest_cpu_correlation(
    session_id: int,
    payload: CpuCorrelationBatch,
    db: Session = Depends(get_db),
):
    if len(payload.items) < 1:
        raise HTTPException(status_code=400, detail="Empty payload")

    records = [
        CorrelationEvent(
            session_id=session_id,
            correlation_id=item.correlation_id,
            cpu_timestamp_ns=item.timestamp_ns,
            cpu_stack_hash=item.stack_hash,
            cpu_function_name=item.function_name,
        )
        for item in payload.items
    ]

    db.bulk_save_objects(records)
    db.commit()

    return {"inserted": len(records)}
