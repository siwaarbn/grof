# M2 – T1 – Week 3: Native + Python Stack Integration

## Goal
Augment CPU correlation events with full execution context by capturing
both native (C/C++) and Python stack frames at CUDA Runtime API entry.

## What changes from Week 2
Week 2 emitted correlation events without stack context.
Week 3 enriches each event with a merged Python + native call stack.

## Implementation Overview
- Native stacks captured in eBPF using bpf_get_stackid()
- Stack addresses transmitted via stack IDs
- User-space resolves addresses to symbols
- Python stack frames merged with native frames per event

## Output
Each correlation event now includes a `stack` field describing
the full CPU execution path leading to GPU work.

## Status
- Stack capture logic implemented
- Symbol resolution implemented
- Runtime validation pending on CUDA-enabled system
