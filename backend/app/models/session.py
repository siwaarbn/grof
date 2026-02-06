from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey

from sqlalchemy.orm import relationship
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    
    start_time = Column(BigInteger, nullable=False)
    end_time = Column(BigInteger, nullable=True)

    git_commit_hash= Column (String , nullable=True)

    tags= Column(String , nullable=True)
    # CPU samples (already fixed)
    cpu_samples = relationship(
        "CpuSample",
        back_populates="session",
        cascade="all, delete-orphan",
    )

   
    gpu_events = relationship(
        "GpuEvent",
        back_populates="session",
        cascade="all, delete-orphan",
    )

