from pydantic import BaseModel
from typing import List


class CpuSampleIn(BaseModel):
    timestamp: float
    thread_id: int
    stack: List[str]


class CpuSampleBatch(BaseModel):
    samples: List[CpuSampleIn]
