#!/usr/bin/env python3
from bcc import BPF
import ctypes as ct
import json
import traceback
from stack_resolver import resolve_stack

OUTFILE = "cpu_correlation_with_stack.json"

class CorrelationEvent(ct.Structure):
    _fields_ = [
        ("timestamp_ns", ct.c_ulonglong),
        ("pid", ct.c_uint),
        ("tid", ct.c_uint),
        ("correlation_id", ct.c_ulonglong),
        ("api_kind", ct.c_uint),
        ("stack_id", ct.c_int),
    ]

def get_python_stack():
    stack = traceback.extract_stack()[:-2]
    return [f"{f.name}" for f in stack]

b = BPF(src_file="correlation_stacks.bpf.c")

b.attach_uprobe(
    name="/home/fbg/grof/libgrof_cuda.so",
    sym="init_grof",
    fn_name="on_init_grof"
)


stack_traces = b.get_table("stack_traces")

f = open(OUTFILE, "a", buffering=1)

def handle_event(cpu, data, size):
    ev = ct.cast(data, ct.POINTER(CorrelationEvent)).contents

    native_frames = []
    if ev.stack_id >= 0:
        stack = stack_traces.walk(ev.stack_id)
        native_frames = resolve_stack(ev.pid, stack)

    python_frames = get_python_stack()

    record = {
        "type": "correlation",
        "timestamp": int(ev.timestamp_ns),
        "pid": int(ev.pid),
        "tid": int(ev.tid),
        "correlation_id": int(ev.correlation_id),
        "stack": python_frames + native_frames,
    }

    f.write(json.dumps(record) + "\n")

b["correlation_events"].open_perf_buffer(handle_event)

print("[INFO] Collecting correlation events")

try:
    while True:
        b.perf_buffer_poll()
except KeyboardInterrupt:
    pass
finally:
    f.close()
