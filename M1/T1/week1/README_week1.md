# Milestone 1 – Week 1  
## Environment Setup & Python Uprobe “Hello World”

### Objective
The goal of Week 1 is to validate that we can:
- Run eBPF programs on our Linux environment
- Use BCC (BPF Compiler Collection) from Python
- Attach a **uprobes** to CPython internals
- Successfully trace Python execution with minimal overhead

This week serves as a **technical baseline** for the rest of Milestone 1.

---

### Environment
- OS: Ubuntu Linux (VM)
- Kernel: 6.x
- Python: 3.12
- eBPF framework: BCC
- Privileges: root (sudo required)

---

### Files

#### `hello_uprobe.py`
Minimal BCC-based eBPF program that:
- Loads a small eBPF program written in C
- Attaches a **uprobes** to CPython’s frame evaluation function
- Prints a trace message every time a Python frame is executed

The uprobe is attached to: **_PyEval_EvalFrameDefault**
inside: /usr/bin/python3.12


This confirms that:
- Symbol resolution works
- User-space uprobes function correctly
- eBPF programs can be loaded and executed

#### `test.py`
Simple Python script with nested function calls.
Used to generate Python execution activity that triggers the uprobe.

---

### How to Run

1. Open a terminal on the Linux machine
2. Run the uprobe tracer:
```bash
sudo python3 hello_uprobe.py
```
3. In another terminal, run:
```python3 test.py```
4. Observe output such as: Python frame executed!

This confirms successful tracing of Python execution.
