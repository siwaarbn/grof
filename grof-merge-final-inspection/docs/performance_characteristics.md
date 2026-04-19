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

## micro_gemm — Runtime Overhead (Nsight Systems)

### Baseline (no profiling)
- Mean runtime: **3797.54 ms**
- 95% CI: **[3763.84, 3831.23] ms**

### Nsight Systems
- Mean runtime: **3747.04 ms**
- 95% CI: **[3715.59, 3778.49] ms**

### Overhead: **−1.33%** (nsys was slightly faster due to measurement variance)

This result is not statistically significant — it shows that Nsight Systems
adds negligible overhead for compute-bound micro-benchmarks.

---

## Nsight Systems Trace Characteristics

- Trace file size: **~265 MB** (`.nsys-rep`)
- GPU kernel timelines: **Yes**
- CPU–GPU correlation: **Limited** (system-level, not Python-aware)
- Python stack traces: **Limited** (no native Python frame resolution)
- Kernel metrics: **Timeline only** (no SM throughput / DRAM utilization)

Nsight Systems provides detailed system-level timelines but generates large trace
files and does not offer explicit CPU–GPU correlation at the Python level.

---

## Py-spy Comparison Methodology

[py-spy](https://github.com/benfred/py-spy) is a sampling profiler for Python
programs with ~1-2% overhead. It does NOT support GPU profiling.

### How to run

```bash
# Install py-spy
pip install py-spy

# Run the comparison script (collects both baseline and py-spy data):
python benchmarks/analysis/run_pyspy.py --benchmarks micro_gemm resnet50 -n 30

# Or manually:
sudo py-spy record -o profile.svg -- python benchmarks/run_suite.py --mode=baseline -b micro_gemm -n 1
```

### Key question (from M2 T3):
> *Is GROF's eBPF profiler competitive with py-spy on CPU-only code?*

| Aspect | py-spy | GROF eBPF |
|--------|--------|-----------|
| Mechanism | Sampling via `process_vm_readv()` | eBPF uprobes on `_PyEval_EvalFrameDefault` |
| Overhead | ~1-2% (documented) | <5% target |
| GPU awareness | ✗ None | ✓ CUDA correlation via CUPTI |
| Output | SVG flamegraph | JSON (backend-ready) |
| Root required | Yes (sudo) | Yes (eBPF requires root) |
| Python stack depth | Full | 20 frames (configurable) |

### Py-spy limitations for GROF use case
- No GPU kernel tracing — cannot correlate CPU calls with GPU kernels
- No CUPTI integration — cannot measure SM throughput or DRAM utilization
- Output is visualization-only — not machine-readable for automated pipelines

> **Note:** Actual py-spy overhead numbers will be filled after running
> `run_pyspy.py` on the test machine. The infrastructure is fully implemented.

---

## Per-Component Overhead Breakdown (Week 2)

This section attributes GROF overhead to individual components.
Run each profiling mode separately with N=30 and 3 warmup iterations, then
compare against the baseline to identify the overhead source.

### How to collect

```bash
python run_suite.py --mode=baseline   -b resnet50 bert -n 30
python run_suite.py --mode=ebpf-only  -b resnet50 bert -n 30
python run_suite.py --mode=cupti-only -b resnet50 bert -n 30
python run_suite.py --mode=grof       -b resnet50 bert -n 30

# Generate attribution report:
python analysis/attribution.py --results-dir results/
```

### Attribution Table

| Component | Overhead (ResNet50) | Overhead (BERT) | Description |
|-----------|--------------------:|----------------:|-------------|
| eBPF Only | *(to be measured)* | *(to be measured)* | CPU-side stack sampling via uprobes |
| CUPTI Only | *(to be measured)* | *(to be measured)* | GPU kernel/activity tracing |
| Full GROF | *(to be measured)* | *(to be measured)* | Both components combined |

### Memory Overhead

| Component | Peak RSS (MB) | Description |
|-----------|-------------:|-------------|
| Baseline | *(to be measured)* | No profiler attached |
| eBPF Only | *(to be measured)* | BPF maps + stack storage |
| CUPTI Only | *(to be measured)* | Activity buffers + range profiler |
| Full GROF | *(to be measured)* | Combined |

> **Note:** Actual numbers will be filled after running on a CUDA-enabled Linux
> machine with BCC and CUPTI available. The infrastructure to collect these
> measurements is now fully implemented.

---

## Comparison with Industry Tools

| Tool | Runtime Overhead (95% CI) | Memory / Trace Size | GPU Support | CPU Stack Depth |
|------|---------------------------|---------------------|-------------|-----------------|
| GROF | *(to be measured)* | JSON (compact, <1 MB) | ✓ | 30 |
| NSYS | **0.13% (−0.26%, +0.53%)** on ResNet50 | **~265 MB** (.nsys-rep) | ✓ | Limited |
| py-spy | *(to be measured)* | SVG (~100 KB) | ✗ | Full |

### How to generate this table automatically

```bash
python benchmarks/analysis/comparison.py --results-dir benchmarks/results/
python benchmarks/analysis/comparison.py --results-dir benchmarks/results/ --output comparison_report.md
```

---

## Summary

| Criterion | Nsight Systems | py-spy | GROF |
|-----------|---------------|--------|------|
| Runtime overhead | Very low (~0.1%) | Low (~1-2%) | Target: <5% |
| GPU profiling | ✓ Timeline | ✗ | ✓ Kernel + metrics |
| CPU-GPU correlation | Limited | N/A | ✓ Explicit |
| Python awareness | Limited | ✓ Full | ✓ Via eBPF |
| Trace size | Large (~265 MB) | Small (~100 KB) | Small (<1 MB) |
| Automation | nsys CLI | py-spy CLI | run_suite.py |

GROF targets a unique position: **low-overhead profiling with explicit
CPU-GPU correlation** — something neither Nsight Systems (system-level) nor
py-spy (CPU-only) provides.

