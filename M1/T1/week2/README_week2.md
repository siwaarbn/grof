# Milestone 1 – Week 2  
## Python Stack Walking via eBPF

### Objective
The goal of Week 2 is to extend the basic Python uprobe implemented in Week 1 in order to:

- Access CPython internal data structures from eBPF
- Walk the Python call stack inside the kernel
- Traverse multiple Python frames using `f_back`
- Validate that deep stack inspection is feasible under eBPF verifier constraints

This week demonstrates that **Python stack unwinding from kernel space is possible**, which is a core requirement for the profiler.

---

### Environment
- OS: Ubuntu Linux (VM)
- Kernel: 6.x
- Python: 3.12
- eBPF framework: BCC
- Privileges: root (sudo required)

---

### Files

#### `stackwalk.py`
BCC-based Python program that:

- Loads an eBPF program written in C
- Attaches a **uprobes** to CPython’s frame evaluation function
- Defines minimal CPython internal structures (e.g. `PyFrameObject`)
- Walks the Python call stack by following `frame->f_back`
- Prints stack-related trace messages from kernel space

Key implementation details:
- Stack walking is implemented using an **unrolled loop** to satisfy eBPF verifier constraints
- User-space memory is accessed safely using `bpf_probe_read_user`
- Stack depth is limited to a fixed number of frames

The uprobe is attached to: **_PyEval_EvalFrameDefault**  
inside: `/usr/bin/python3.12`

This confirms that:
- CPython internal structures can be accessed from eBPF
- Python stack frames can be traversed in kernel space
- eBPF verifier constraints can be satisfied for controlled stack walking

#### `test.py`
Simple Python script with nested function calls (same file from week 1).

Used to generate Python execution activity with multiple stack frames, allowing the stack walking logic to be validated.

---

### How to Run

1. Open a terminal on the Linux machine
2. Run the stack walking tracer:
```bash
sudo python3 stackwalk.py```
3. In another terminal, run: 
```bash 
python3 test.py```
4. Observe trace output corresponding to Pyhton stack travesral. 
This confirms successful kernel-side Python stack walking. 
