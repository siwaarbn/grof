from sqlalchemy import Column, Integer, String, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base

class CpuSample(Base):
    __tablename__ = "cpu_samples"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    timestamp = Column(BigInteger, nullable=False)  # nanoseconds
    thread_id = Column(Integer)
    stack_hash = Column(String, ForeignKey("stack_frames.hash"))

    session = relationship("Session")
    frame = relationship("StackFrame")

