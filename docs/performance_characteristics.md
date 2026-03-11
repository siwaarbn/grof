# Performance Characteristics — Milestone 2 (T3)

This document reports the runtime overhead and performance characteristics of GROF
and compares it against industry profiling tools, in particular NVIDIA Nsight Systems
and py-spy.

All measurements were performed with 30 iterations and 3 warmup runs. Reported
numbers include 95% confidence intervals.

---

## ResNet50 — Runtime Overhead (Nsight Systems)

### Baseline (no profiling)
- Mean runtime: **4341.89 ms**
- 95% CI: **[4333.32, 4350.47] ms**

### Nsight Systems
- Mean runtime: **4347.67 ms**
- 95% CI: **[4339.11, 4356.23] ms**

### Runtime overhead calculation

Overhead is computed as:

\[
\frac{\text{Mean}_{\text{NSYS}} - \text{Mean}_{\text{Baseline}}}
{\text{Mean}_{\text{Baseline}}} \times 100
\]

\[
\frac{4347.67 - 4341.89}{4341.89} \times 100 = \mathbf{0.13\%}
\]

### 95% Confidence Interval for Overhead
- Lower bound: **−0.26%**
- Upper bound: **+0.53%**

**Result:**  
Nsight Systems introduces a runtime overhead of **0.13%**
(95% CI: **−0.26% to +0.53%**) for the ResNet50 benchmark.

---

## Nsight Systems Trace Characteristics

- Trace file size: **~265 MB** (`.nsys-rep`)
- GPU kernel timelines: **Yes**
- CPU–GPU correlation: **Limited**
- Python stack traces: **Limited**

Nsight Systems provides detailed system-level timelines but generates large trace
files and does not offer explicit CPU–GPU correlation at the Python level.

---

## Comparison with Industry Tools

| Tool   | Runtime Overhead (95% CI) | Memory / Trace Size | GPU Support | CPU Stack Depth |
|--------|---------------------------|---------------------|-------------|-----------------|
| GROF   | *(to be filled)*          | *(to be filled)*   | ✓           | 30              |
| NSYS   | **0.13% (−0.26%, +0.53%)**| **~265 MB**         | ✓           | Limited         |
| py-spy | *(to be filled)*          | *(to be filled)*   | ✗           | 30              |

---

## Summary

Nsight Systems exhibits very low runtime overhead on ResNet50 but produces
large trace files and focuses on system-level profiling. GROF targets a
low-overhead, correlation-centric profiling approach with compact traces and
explicit CPU–GPU correlation.
