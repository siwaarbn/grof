# M2 – T1 – Week 4: Performance Tuning & Validation

## Goals
- Validate correctness (thread-local correlation, no mixing)
- Measure overhead with T3 benchmark suite (target <5%)
- Prevent event loss (perf buffer drops) under load
- Align output schema with backend ingestion (T4)
- Document the full correlation flow

## Deliverables
- Overhead report (baseline vs GROF enabled)
- Correctness checks (multi-thread / multi-stream workloads)
- Tuned settings (event rate, perf buffer size, filtering)
- Documentation: correlation ID flow and limitations

## Requirements
- CUDA runtime environment for end-to-end validation
- Collaboration with T3 for benchmark execution and measurements
