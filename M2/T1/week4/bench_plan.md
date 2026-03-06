# Benchmark Plan

## Goal

Evaluate the overhead introduced by the CPU correlation mechanism implemented using eBPF and BCC.

---

## Setup
- Machine: Linux VM used for the GROF project
- Kernel: Ubuntu 24.04 kernel with eBPF support
- Tooling: Python BCC framework
- Target library: libgrof_cuda.so

---

## Methodology
1. Run the baseline program without the profiler.
2. Run the program with the profiler enabled (correlation_stacks.py).
3. Trigger CUDA calls using init_grof() to generate events.
4. Measure:
	•Execution time
	•Event generation rate
	•CPU usage

---

## Metrics
• Runtime overhead
• Number of correlation events generated
• Stack trace resolution latency

---

## Expected Results

The profiler should introduce minimal overhead while successfully capturing correlation events and stack traces.

---

