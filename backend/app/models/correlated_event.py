from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey
from app.database import Base

class CorrelatedEvent(Base):
    __tablename__ = "correlated_events"

    id = Column(Integer, primary_key=True)

    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    # CPU side
    cpu_timestamp_ns = Column(BigInteger, nullable=False)
    cpu_stack_hash = Column(BigInteger, nullable=False)

    # GPU side (aligned!)
    gpu_event_id = Column(Integer, ForeignKey("gpu_events.id"), nullable=False)
    gpu_start_time_ns = Column(BigInteger, nullable=False)
    gpu_end_time_ns = Column(BigInteger, nullable=False)

    kernel_name = Column(String, nullable=False)
