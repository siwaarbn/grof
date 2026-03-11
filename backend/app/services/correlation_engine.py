from sqlalchemy.orm import Session
from app.models.correlation_event import CorrelationEvent
from app.models.gpu_event import GpuEvent
from app.models.session_time_offset import SessionTimeOffset

def run_correlation(db: Session, session_id: int):
    offset = (
        db.query(SessionTimeOffset)
        .filter(SessionTimeOffset.session_id == session_id)
        .first()
    )
    if not offset:
        raise RuntimeError("No time offset for session")

    events = (
        db.query(CorrelationEvent)
        .filter(CorrelationEvent.session_id == session_id)
        .all()
    )

    for ce in events:
        gpu = (
            db.query(GpuEvent)
            .filter(GpuEvent.correlation_id == ce.correlation_id)
            .first()
        )
        if not gpu:
            continue

        ce.gpu_event_id = gpu.id

    db.commit()
