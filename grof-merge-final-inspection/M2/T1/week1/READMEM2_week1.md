# M2 – T1 – Week 1: CUDA Runtime API Interception

## Goal
Establish the CPU-side interception point required for CPU–GPU correlation.

Specifically, this week identifies and hooks CUDA Runtime API entry points
in order to generate a thread-local correlation identifier whenever GPU
work is launched from the CPU.

This correlation ID will later be used to join CPU stack traces (T1)
with GPU kernel execution traces collected via CUPTI (T2).

---

## Design Rationale

- PyTorch launches GPU work through the CUDA Runtime API
- The CUDA Runtime API is implemented in `libcudart.so`
- Hooking at this boundary provides:
  - a stable, framework-independent interception point
  - a pre-GPU-execution signal
  - minimal overhead

Uprobes are used to instrument user-space functions without modifying
application code.

---

## Targeted CUDA API Functions

The following CUDA Runtime API functions are intercepted:

- `cudaLaunchKernel`
- `cudaMemcpyAsync`
- `cudaStreamSynchronize`

---

## Implementation Overview

- A uprobe is attached to each target function in `libcudart.so`
- On entry:
  - the current thread ID (TID) is extracted
  - a correlation ID is generated using a monotonic timestamp
  - the correlation ID is stored in a BPF hash map keyed by TID

This establishes a per-thread mapping:
CPU thread -> correlation_id


---

## Files

- `cuda_uprobes.bpf.c`
  - eBPF program defining the uprobe handler
  - Maintains a TID → correlation_id map

- `cuda_uprobes.py`
  - User-space loader using BCC
  - Attaches uprobes to `libcudart.so`
  - No runtime assumptions are made at load time

---

## Status

- Implementation: COMPLETE
- Runtime validation: PENDING

Runtime validation requires a system with the CUDA runtime library
(`libcudart.so`) available. No design or code changes are expected once
validation is performed.

---

## Next Steps (Week 2)

- Emit correlation events to user space via perf buffers
- Serialize events to `cpu_correlation.json`

