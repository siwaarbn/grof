from bcc import BPF
import time

# BPF program in C
bpf_source = r"""
int trace_python(struct pt_regs *ctx) {
    bpf_trace_printk("Python frame executed!\n");
    return 0;
}
"""

# Load BPF
b = BPF(text=bpf_source)

# Attach uprobe to CPython's frame evaluator
b.attach_uprobe(
    name="/usr/bin/python3.12",
    sym="_PyEval_EvalFrameDefault",
    fn_name="trace_python"
)

print("Tracing Python function calls... Press Ctrl-C to stop.")

while True:
    try:
        b.trace_print()
    except KeyboardInterrupt:
        break

