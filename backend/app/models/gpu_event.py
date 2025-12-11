from sqlalchemy import Column, Integer, String, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class GpuEvent(Base):
    __tablename__ = "gpu_events"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    name = Column(String)
    start_time = Column(BigInteger)
    end_time = Column(BigInteger)
    stream_id = Column(Integer)

    session = relationship("Session", back_populates="gpu_events")
