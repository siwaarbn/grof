from pydantic import BaseModel
from datetime import datetime


class SessionCreate(BaseModel):
    name: str
    date: datetime
    duration: int
    status: str


class SessionOut(SessionCreate):
    id: int

    class Config:
        orm_mode = True
