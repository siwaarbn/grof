<<<<<<< HEAD
from sqlalchemy import Column, Integer, BigInteger, ForeignKey, DateTime,String
=======
from sqlalchemy import Column, Integer, BigInteger, Text, ForeignKey, DateTime
>>>>>>> 16ad9c0 (Fix backend: resolve main.py conflict, fix cpu_stack schema, add ingest.py T1/T2 pipeline)
from sqlalchemy.sql import func
from app.database import Base


class CorrelationEvent(Base):
    __tablename__ = "correlation_events"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    correlation_id = Column(BigInteger, nullable=False)

    cpu_timestamp_ns = Column(BigInteger, nullable=False)
<<<<<<< HEAD
  
    cpu_function_name = Column(String, nullable=True)
    cpu_stack = Column(String, nullable=True)
=======

    # Stack is stored as a JSON-serialized list of frame strings from T1.
    # T1 produces: "stack": ["outer", "middle", "inner", "at::matmul", ...]
    # We store the full JSON string here for easy reconstruction.
    cpu_stack = Column(Text, nullable=True)
>>>>>>> 16ad9c0 (Fix backend: resolve main.py conflict, fix cpu_stack schema, add ingest.py T1/T2 pipeline)

    gpu_kernel_id = Column(Integer, ForeignKey("gpu_events.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
