#!/usr/bin/env python3
from bcc import BPF
import ctypes as ct
import json
import os
import subprocess
import time

OUTFILE = "cpu_correlation.json"

def find_libcudart():
    try:
        path = subprocess.check_output(
            ["bash", "-lc", "ldconfig -p | awk '/libcudart\\.so/{print $NF; exit}'"]
        ).decode().strip()
        if path and os.path.exists(path):
            return path
    except Exception:
        pass
    return None

# Must match the C struct layout
class CorrelationEvent(ct.Structure):
    _fields_ = [
        ("timestamp_ns", ct.c_ulonglong),
        ("pid", ct.c_uint),
        ("tid", ct.c_uint),
        ("correlation_id", ct.c_ulonglong),
        ("api_kind", ct.c_uint),
    ]

API_KIND_TO_NAME = {
    0: "unknown",
    1: "cudaLaunchKernel",
    2: "cudaMemcpyAsync",
    3: "cudaStreamSynchronize",
}

libcudart = find_libcudart()
if not libcudart:
    print("[INFO] libcudart.so not found.")
    print("[INFO] Cannot attach uprobes yet; you can still commit Week 2 artifacts.")
    raise SystemExit(0)

print(f"[INFO] Using libcudart: {libcudart}")

b = BPF(src_file="correlation_events.bpf.c")

# Attach uprobes to each CUDA API symbol
attach_plan = [
    ("cudaLaunchKernel", "on_cudaLaunchKernel"),
    ("cudaMemcpyAsync", "on_cudaMemcpyAsync"),
    ("cudaStreamSynchronize", "on_cudaStreamSynchronize"),
]

attached = 0
for sym, fn in attach_plan:
    try:
        b.attach_uprobe(name=libcudart, sym=sym, fn_name=fn)
        print(f"[INFO] Attached uprobe: {sym} -> {fn}")
        attached += 1
    except Exception as e:
        print(f"[WARN] Failed to attach {sym}: {e}")

if attached == 0:
    print("[ERROR] No uprobes attached. Symbols may be missing/hidden or libcudart path is wrong.")
    raise SystemExit(1)

print(f"[INFO] Writing events to {OUTFILE} (JSON lines). Ctrl-C to stop.")

f = open(OUTFILE, "a", buffering=1)

def handle_event(cpu, data, size):
    ev = ct.cast(data, ct.POINTER(CorrelationEvent)).contents
    api_name = API_KIND_TO_NAME.get(ev.api_kind, "unknown")

    record = {
        "type": "correlation",
        "timestamp": int(ev.timestamp_ns),
        "pid": int(ev.pid),
        "tid": int(ev.tid),
        "correlation_id": int(ev.correlation_id),
        "api": api_name,
        # stack will be added in Week 3
        "stack": [],
    }

    f.write(json.dumps(record) + "\n")

b["correlation_events"].open_perf_buffer(handle_event)

try:
    while True:
        b.perf_buffer_poll()
except KeyboardInterrupt:
    print("\n[INFO] Stopped.")
finally:
    f.close()
