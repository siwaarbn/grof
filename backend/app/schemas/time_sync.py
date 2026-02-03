from pydantic import BaseModel

class TimeSyncIn(BaseModel):
    cpu_sync_timestamp_ns: int
    gpu_sync_timestamp_ns: int