from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)
    status = Column(String, nullable=False)

    # CPU samples (already fixed)
    cpu_samples = relationship(
        "CpuSample",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    # ✅ FIX: GPU events relationship
    gpu_events = relationship(
        "GpuEvent",
        back_populates="session",
        cascade="all, delete-orphan",
    )

