from sqlalchemy import Column, Integer, String, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class GpuEvent(Base):
    __tablename__ = "gpu_events"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    correlation_id = Column(BigInteger, nullable=True)  

    name = Column(String, nullable=False)
    start_time = Column(BigInteger, nullable=False)
    end_time = Column(BigInteger, nullable=False)
    stream_id = Column(Integer, nullable=True)

    session = relationship(
        "Session",
        back_populates="gpu_events",
    )