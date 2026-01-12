from pydantic import BaseModel
from typing import List


class CpuCorrelationItem(BaseModel):
    correlation_id: int
    timestamp_ns: int
    stack_hash: str
    function_name: str | None = None


class CpuCorrelationBatch(BaseModel):
    items: List[CpuCorrelationItem]
