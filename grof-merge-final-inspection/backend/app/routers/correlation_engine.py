from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.correlation_engine import run_correlation

router = APIRouter(prefix="/sessions", tags=["Correlation Engine"])

@router.post("/{session_id}/run-correlation")
def trigger_correlation(
    session_id: int,
    db: Session = Depends(get_db),
):
    run_correlation(db, session_id)
    return {"status": "correlation complete"}
