# Week 4 – Sampling-Based Python Stack Profiler (eBPF)

## Objective

The goal of **Week 4** is to move from **event-based tracing** (Week 3) to a **sampling-based profiler** for Python using **eBPF**.

Instead of tracing every Python frame execution, we periodically sample the Python interpreter state and aggregate **hot call stacks**.  
This approach is closer to real-world profilers and has significantly lower overhead.

---

## Environment Verification

Before running the profiler, verify that the environment supports eBPF and BCC.

1st Command:
```bash
python3 -c "import bcc; print('bcc ok')"
```
Expected output: 
``` bcc ok ```

2nd Command:
```bash
bpftool version
```
Expected output:
```bpftool v7.x
using libbpf v1.x
```

---

## Running guidelines

The file `test_week4.py` is a simple Python program that repeatedly calls nested functions and sleeps briefly to create a measurable workload.

### Run the test program
```bash 
python3 test_week4.py
```
Expected behavior:
* The program runs indefinitely
* Press Ctrl+C to stop
* A KeyboardInterrupt is expected and normal

### Running the Week 4 Profiler

The profiler must be run as root because it attaches eBPF uprobes.

Start the profiler: `sudo python3 week4_profiler.py`
Expected output:
```bash 
Profiling Python stacks (Week 4). Ctrl-C to stop.
Sampling... Press Ctrl-C to stop.
```
After a few seconds, aggregated stack samples are printed periodically.

---

## Example Output

```bash
--- Top stacks ---

PID 4507 - 9 samples
select [libc.so.6]

PID 4507 - 1 samples
_PyEval_EvalFrameDefault [python3.10]
```

### Interpretation

PID identifies the sampled process
- Samples indicate how often a stack was observed
- `_PyEval_EvalFrameDefault` confirms that Python interpreter frames are being sampled
- libc functions indicate system-level waiting or I/O

This confirms that:
- eBPF sampling works
- Python stacks are successfully captured
- Aggregation across time is functional

---

## Notes and Limitations

- Some stack frames may appear as [unknown] due to symbol resolution limits
- Compiler warnings during BPF compilation are expected and harmless
- The profiler samples user-space Python execution, not kernel stacks

---

## Conclusion

Week 4 successfully implements a sampling-based Python profiler using eBPF.
This completes the transition from precise tracing to scalable statistical profiling and concludes the core technical goals of the project.
