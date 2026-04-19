from pydantic import BaseModel
from typing import List, Union


class CpuSampleIn(BaseModel):
    timestamp: float
    thread_id: int
    stack_hash: Union[str, int]


class CpuSampleBatch(BaseModel):
    samples: List[CpuSampleIn]