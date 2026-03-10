from sqlalchemy.orm import Session
from app.models.session import Session as ProfilingSession
import time


def start_session(
    db: Session,
    name: str = "unnamed",
    git_commit_hash: str = None,
    tags: str = None,
):
    session = ProfilingSession(
        name=name,
        start_time=time.time_ns(),
        end_time=None,
        git_commit_hash=git_commit_hash,
        tags=tags,
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