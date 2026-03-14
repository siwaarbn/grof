#!/usr/bin/env python3
import os
import subprocess
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

API_KIND_TO_NAME = {
    1: "cudaLaunchKernel",
    2: "cudaMemcpyAsync",
    3: "cudaStreamSynchronize",
}

def find_libgrof():
    candidates = [
        "./libgrof_cuda.so",
        "../libgrof_cuda.so",
        "../../libgrof_cuda.so",
        "../../../libgrof_cuda.so",
    ]
    for p in candidates:
        if os.path.exists(p):
            return os.path.abspath(p)
    try:
        path = subprocess.check_output(
            ["bash", "-lc", "ldconfig -p | awk '/libgrof_cuda.so/{print $NF; exit}'"]
        ).decode().strip()
        if path and os.path.exists(path):
            return path
    except Exception:
        pass
    return None

def get_python_stack():
    stack = traceback.extract_stack()[:-2]
    return [f.name for f in stack]

b = BPF(src_file="correlation_stacks.bpf.c")

libgrof = find_libgrof()
if not libgrof:
    raise RuntimeError("libgrof_cuda.so not found")

b.attach_uprobe(
    name=libgrof,
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

    api = API_KIND_TO_NAME.get(ev.api_kind, "unknown")

    record = {
        "type": "correlation",
        "timestamp": int(ev.timestamp_ns),
        "pid": int(ev.pid),
        "tid": int(ev.tid),
        "correlation_id": int(ev.correlation_id),
        "api": api,
        "stack": native_frames + [api]
    }

    f.write(json.dumps(record) + "\n")

b["correlation_events"].open_perf_buffer(handle_event)

print(f"[INFO] Collecting correlation events with stacks -> {OUTFILE}")

try:
    while True:
        b.perf_buffer_poll()
except KeyboardInterrupt:
    pass
finally:
    f.close()
