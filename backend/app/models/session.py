from sqlalchemy import Column, Integer, String, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    start_time = Column(BigInteger, nullable=True)
    end_time = Column(BigInteger, nullable=True)
    git_commit_hash = Column(String, nullable=True)
    tags = Column(String, nullable=True)

    cpu_samples = relationship("CpuSample", back_populates="session")
    gpu_events = relationship("GpuEvent", back_populates="session")

