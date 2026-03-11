from sqlalchemy import Column, Integer, String, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base

class CpuSample(Base):
    __tablename__ = "cpu_samples"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
<<<<<<< HEAD
    timestamp = Column(BigInteger, nullable=False)  # nanoseconds
    thread_id = Column(Integer)
    stack_hash = Column(String)


    session = relationship("Session", back_populates="cpu_samples")

   # //frame = relationship("StackFrame", back_populates="samples")


=======
    timestamp = Column(BigInteger, nullable=False)
    thread_id = Column(Integer)
    stack_hash = Column(String, ForeignKey("stack_frames.hash"))

    # Relationships
    session = relationship("Session", back_populates="cpu_samples")
    frame = relationship("StackFrame", back_populates="samples")
>>>>>>> frontend
