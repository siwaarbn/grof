#!/usr/bin/env python3
"""
M2/T1/Week 3 — Correlation tracer with stack capture.

Attaches uprobes to CUDA Runtime API symbols (cudaLaunchKernel,
cudaMemcpyAsync, cudaStreamSynchronize) via libcudart and to
libgrof_cuda.so's init_grof constructor.

Each event captures the user-space call stack so the backend can
build flamegraphs showing which CPU functions triggered GPU work.
"""

import os
import subprocess
import argparse
from bcc import BPF
import ctypes as ct
import json
import traceback
from stack_resolver import resolve_stack

parser = argparse.ArgumentParser()
parser.add_argument("--output", default="cpu_correlation_with_stack.json")
args = parser.parse_args()

OUTFILE = args.output

output_dir = os.path.dirname(OUTFILE)
if output_dir:
    os.makedirs(output_dir, exist_ok=True)


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
    0: "unknown",
    1: "cudaLaunchKernel",
    2: "cudaMemcpyAsync",
    3: "cudaStreamSynchronize",
}


def find_libcudart():
    """Locate libcudart.so — the CUDA Runtime that exports the API symbols."""
    candidates = [
        "/usr/local/cuda/lib64/libcudart.so",
        "/usr/lib/x86_64-linux-gnu/libcudart.so",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    try:
        path = subprocess.check_output(
            ["bash", "-lc", "ldconfig -p | awk '/libcudart\\.so/{print $NF; exit}'"]
        ).decode().strip()
        if path and os.path.exists(path):
            return path
    except Exception:
        pass
    return None


def find_libgrof():
    """Locate libgrof_cuda.so — our custom CUDA profiler library."""
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


# ── Load BPF program ─────────────────────────────────────────────
b = BPF(src_file="correlation_stacks.bpf.c")

# ── Attach uprobes to CUDA Runtime API (the core hooks) ─────────
libcudart = find_libcudart()
attached = 0

if libcudart:
    print(f"[INFO] Found libcudart: {libcudart}")

    attach_plan = [
        ("cudaLaunchKernel",       "on_cudaLaunchKernel"),
        ("cudaMemcpyAsync",        "on_cudaMemcpyAsync"),
        ("cudaStreamSynchronize",  "on_cudaStreamSynchronize"),
    ]

    for sym, fn in attach_plan:
        try:
            b.attach_uprobe(name=libcudart, sym=sym, fn_name=fn)
            print(f"[INFO] ✅ Attached uprobe: {sym} -> {fn}")
            attached += 1
        except Exception as e:
            print(f"[WARN] ⚠️  Failed to attach {sym}: {e}")
else:
    print("[WARN] libcudart.so not found — CUDA API hooks will not fire")

# ── Attach to init_grof in libgrof_cuda.so (optional, for compat) ─
libgrof = find_libgrof()
if libgrof:
    try:
        b.attach_uprobe(name=libgrof, sym="init_grof", fn_name="on_init_grof")
        print(f"[INFO] ✅ Attached uprobe: init_grof (libgrof_cuda.so)")
        attached += 1
    except Exception as e:
        print(f"[WARN] ⚠️  Failed to attach init_grof: {e}")
else:
    print("[WARN] libgrof_cuda.so not found — init_grof hook skipped")

if attached == 0:
    print("[ERROR] No uprobes attached! No events will be captured.")
    print("[ERROR] Make sure libcudart.so is installed and CUDA symbols are available.")
    raise SystemExit(1)

print(f"[INFO] {attached} uprobe(s) attached. Writing events to {OUTFILE}")

# ── Event handling ───────────────────────────────────────────────
stack_traces = b.get_table("stack_traces")

f = open(OUTFILE, "w", buffering=1)
event_count = 0


def handle_event(cpu, data, size):
    global event_count
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
    f.flush()
    event_count += 1

    if event_count % 100 == 0:
        print(f"[INFO] Captured {event_count} events so far...")


b["correlation_events"].open_perf_buffer(handle_event)

print(f"[INFO] Collecting correlation events with stacks -> {OUTFILE}")
print("[INFO] Press Ctrl-C to stop.")

try:
    while True:
        b.perf_buffer_poll()
except KeyboardInterrupt:
    pass
finally:
    f.close()
    print(f"\n[INFO] Done. Captured {event_count} event(s) -> {OUTFILE}")
