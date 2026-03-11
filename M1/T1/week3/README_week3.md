# Week 3 – Python Stack Unwinding Validation

## Objective

The objective of Week 3 is to **validate and analyze the Python stack unwinding
mechanism implemented in Week 2**.
No new eBPF code is introduced in this week. Instead, the focus is on:

- Verifying that Python stack unwinding works correctly at runtime
- Ensuring compatibility with the current Python version
- Observing stack sampling behavior and outputs
- Interpreting compiler warnings and runtime results

This week serves as a **runtime validation and analysis phase**.

---

## Environment Verification

Before running the stack unwinding profiler, the environment was verified to ensure that all required components are available:

### BCC availability

Command:
```bash
python3 -c "import bcc; print('bcc ok')"
```
Expected output:
``` bcc ok ```
This confirms that the BCC Python bindings are correctly installed and usable.

### eBPF tooling

Command:
```bash
bpftool version
```
Expected output: 
```bpftool v7.x
using libbpf v1.x
```
This confirms that:
- eBPF support is enabled in the kernel
- bpftool is available
- libbpf is correctly installed

---

## Code reuse from previous weeks

Week 3 reuses cod developed in earlier weeks:
- Week 1: `test.py`: Python workload generating nested function calls.

- Week 2: `stackwalk.py`: eBPF-based Python stack unwinding implementation using a uprobe attached to `_PyEval_EvalFrameDefault`.

No changes were made to these files during Week 3. This week focuses exclusively on validating their runtime behavior.

---

## Running the Validation 

### Start the Python workload

In one terminal, run `python3 test.py`. This script continuously executes nested Python function calls and runs until interrupted manually.
Interrupting the program with Ctrl-C produces a Python traceback, confirming the presence of a deep and active Python call stack.

### Start the stack unwinding profiler

In a second terminal, run `sudo python3 stackwalk.py`. Expected behavior:
- Compilation warnings may appear (e.g., macro redefinitions, loop unrolling)
- The profiler starts successfully
- Python stack traces are printed periodically
- Stack samples are aggregated by call path
Example output:
```bash
Profiling Python stacks (Week 3). Ctrl-C to stop.
outer;middle;inner 42
outer;middle 15
```

---

## Observed Warnings

During execution, warnings such as the following may appear:
* Macro redefinition warnings (`__HAVE_BUILTIN_BSWAP*`)
* Loop unrolling warnings emitted by the BPF verifier

These warnings are expected when compiling BPF programs with BCC and do not prevent correct execution.
Stack sampling continues normally despite these warnings.

---

## Validation Results

The following aspects were successfully validated:
* The uprobe attaches correctly to `_PyEval_EvalFrameDefault`
* Python frame pointers are safely read from user space
* Function names are extracted correctly from Python frames
* Stack depth and call order match the Python workload
* Stack samples are continuously collected and aggregated
This confirms that the Python stack unwinding mechanism implemented in Week 2 functions correctly at runtime.

---

##Conclusion

Week 3 validates the correctness and stability of the Python stack unwinding implementation using eBPF.
By confirming runtime behavior and analyzing stack samples, this week establishes a solid foundation for extending the profiler in Week 4.
No additional source files were required for this week.
