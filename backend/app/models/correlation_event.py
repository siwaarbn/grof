from sqlalchemy import Column, Integer, BigInteger, ForeignKey, DateTime,String
from sqlalchemy.sql import func
from app.database import Base

class CorrelationEvent(Base):
    __tablename__ = "correlation_events"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    correlation_id = Column(BigInteger, nullable=False)

    cpu_timestamp_ns = Column(BigInteger, nullable=False)
  
    cpu_function_name = Column(String, nullable=True)
    cpu_stack = Column(String, nullable=True)

    gpu_kernel_id = Column(Integer, ForeignKey("gpu_events.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
