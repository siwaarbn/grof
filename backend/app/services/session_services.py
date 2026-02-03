from datetime import datetime
from sqlalchemy.orm import Session
from app.models.session import Session as ProfilingSession
import time
def start_session(db: Session, name: str | None = None):
    session = ProfilingSession(
        name=name or "unnamed",
        start_time=time.time_ns(),
        end_time=None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def stop_session(db: Session, session_id: int):
    session = db.get(ProfilingSession, session_id)
    if not session:
        return None

    session.end_time = time.time_ns()
    db.commit()
    return session
