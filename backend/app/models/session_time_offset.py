from sqlalchemy import Column, Integer, BigInteger, ForeignKey
from app.database import Base

class SessionTimeOffset(Base):
    __tablename__ = "session_time_offsets"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    cpu_sync_timestamp_ns = Column(BigInteger, nullable=False)
    gpu_sync_timestamp_ns = Column(BigInteger, nullable=False)

    offset_ns = Column(BigInteger, nullable=False)
