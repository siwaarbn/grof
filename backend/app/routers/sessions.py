from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.session import Session as ProfilingSession
import traceback

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("")
def list_sessions(db: Session = Depends(get_db)):
    try:
        sessions = db.query(ProfilingSession).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "date": s.date,
                "duration": s.duration,
                "status": s.status,
            }
            for s in sessions
        ]
    except Exception as e:
        print("🔥 ERROR IN /sessions")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
