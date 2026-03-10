from pydantic import BaseModel
from typing import List

class GpuEventArgs(BaseModel):
    correlationId: int | None = None
    externalId: int | None = None

class GpuEventItem(BaseModel):
    name: str
    ph: str | None = None
    ts: float
    dur: float
    pid: int | None = None
    tid: int | None = None
    args: GpuEventArgs | None = None

class GpuEventBatch(BaseModel):
    events: List[GpuEventItem]
