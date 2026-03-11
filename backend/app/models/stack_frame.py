from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.database import Base

class StackFrame(Base):
    __tablename__ = "stack_frames"

    hash = Column(String, primary_key=True)
    function_name = Column(String, nullable=False)
    file_path = Column(String)

<<<<<<< HEAD
   
    #samples = relationship("CpuSample", back_populates="frame")
=======
    samples = relationship("CpuSample", back_populates="frame")
>>>>>>> frontend
