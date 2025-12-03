from sqlalchemy import Column, String, Integer
from app.database import Base

class StackFrame(Base):
    __tablename__ = "stack_frames"

    hash = Column(String, primary_key=True)
    function_name = Column(String, nullable=False)
    file_path = Column(String)
    line_no = Column(Integer)
