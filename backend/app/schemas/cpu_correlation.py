from pydantic import BaseModel
from typing import List


class CpuCorrelationItem(BaseModel):
    type: str | None = None
    timestamp: int             
    pid: int | None = None
    tid: int | None = None
    correlation_id: int
    stack: List[str]  

class CpuCorrelationBatch(BaseModel):
    items: List[CpuCorrelationItem]
