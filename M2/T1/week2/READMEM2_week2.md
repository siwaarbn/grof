# M2 – T1 – Week 2: Emit CPU Correlation Events

## Goal
Emit CPU-side correlation events when CUDA Runtime API calls occur,
so that later components can join CPU stacks (T1) with GPU kernels (T2).

## What changed from Week 1
Week 1 stored a per-thread correlation ID (TID → ID) in a BPF map.
Week 2 adds a structured event stream to user space via a perf buffer.

## Event structure
Each CUDA Runtime API entry emits:

- timestamp (ns)
- pid, tid
- correlation_id
- api (which CUDA API function triggered the event)

## Output
User space serializes events to: `cpu_correlation.json` (JSON lines)

## Status
- Implementation: COMPLETE
- Runtime validation: PENDING (requires libcudart.so + CUDA activity)
