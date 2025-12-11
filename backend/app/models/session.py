from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    git_commit_hash = Column(String)
    tags = Column(String)

    cpu_samples = relationship("CpuSample", back_populates="session")
    gpu_events = relationship("GpuEvent", back_populates="session")
