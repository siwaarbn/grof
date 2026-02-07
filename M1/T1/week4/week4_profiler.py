from bcc import BPF
from time import sleep
import signal
import argparse

BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

struct key_t {
    u32 pid;
    int user_stack_id;
};

BPF_HASH(counts, struct key_t, u64);
BPF_STACK_TRACE(stack_traces, 8192);

int on_sample(struct pt_regs *ctx) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;

    struct key_t key = {};
    key.pid = pid;
    key.user_stack_id = stack_traces.get_stackid(ctx, BPF_F_USER_STACK);

    if (key.user_stack_id < 0)
        return 0;

    u64 zero = 0, *val;
    val = counts.lookup_or_try_init(&key, &zero);
    if (val) {
        (*val)++;
    }
    return 0;
}
"""
b = BPF(text=BPF_PROGRAM)

PERF_TYPE_SOFTWARE = 1
PERF_COUNT_SW_CPU_CLOCK = 0

b.attach_perf_event(
    ev_type=PERF_TYPE_SOFTWARE,
    ev_config=PERF_COUNT_SW_CPU_CLOCK,
    fn_name="on_sample",
    sample_freq=99,
)

def print_stacks(signum=None, frame=None):
    print("\n--- Top stacks ---")
    counts = b.get_table("counts")
    stack_traces = b.get_table("stack_traces")

    items = sorted(
	counts.items(),
	key=lambda x: x[1].value,
	reverse=True)

    for (key, value) in items[:10]:
        print(f"\nPID {key.pid} — {value.value} samples")
        stack = stack_traces.walk(key.user_stack_id)
        for addr in stack:
            sym = b.sym(addr, key.pid, show_module=True)
            print(f"  {sym}")

    exit(0)

signal.signal(signal.SIGINT, print_stacks)

print("Sampling... Press Ctrl-C to stop.")
while True:
    sleep(1)
