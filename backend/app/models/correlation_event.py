from sqlalchemy import Column, Integer, BigInteger, String, DateTime
from sqlalchemy.sql import func

from app.database import Base


class CorrelationEvent(Base):
    __tablename__ = "correlation_event"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    correlation_id = Column(BigInteger, nullable=False)
    cpu_timestamp_ns = Column(BigInteger, nullable=False)
    cpu_stack_hash = Column(String, nullable=False)
    cpu_function_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
