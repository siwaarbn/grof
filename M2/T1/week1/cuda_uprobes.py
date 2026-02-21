#!/usr/bin/env python3
from bcc import BPF
import subprocess
import os

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

libcudart = find_libcudart()

if not libcudart:
    print("[INFO] libcudart.so not found.")
    print("[INFO] Uprobe attachment deferred until CUDA runtime is available.")
    exit(0)

print(f"[INFO] Using libcudart: {libcudart}")

bpf = BPF(src_file="cuda_uprobes.bpf.c")

symbols = [
    "cudaLaunchKernel",
    "cudaMemcpyAsync",
    "cudaStreamSynchronize",
]

for sym in symbols:
    try:
        bpf.attach_uprobe(
            name=libcudart,
            sym=sym,
            fn_name="on_cuda_runtime_entry"
        )
        print(f"[INFO] Attached uprobe to {sym}")
    except Exception as e:
        print(f"[WARN] Failed to attach uprobe to {sym}: {e}")

print("[INFO] CUDA Runtime API uprobe loader initialized.")
