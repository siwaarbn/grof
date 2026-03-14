#include <uapi/linux/ptrace.h>
#include <linux/sched.h>

struct correlation_event {
    u64 timestamp_ns;
    u32 pid;
    u32 tid;
    u64 correlation_id;
    u32 api_kind;
    s32 stack_id;
};

BPF_STACK_TRACE(stack_traces, 1024);
BPF_PERF_OUTPUT(correlation_events);

static __always_inline u32 get_pid() {
    return bpf_get_current_pid_tgid() >> 32;
}

static __always_inline u32 get_tid() {
    return (u32)bpf_get_current_pid_tgid();
}

int on_init_grof(struct pt_regs *ctx)
{
    struct correlation_event ev = {};

    ev.timestamp_ns = bpf_ktime_get_ns();
    ev.pid = get_pid();
    ev.tid = get_tid();
    ev.correlation_id = ev.timestamp_ns;
    ev.api_kind = 1;

    ev.stack_id = stack_traces.get_stackid(ctx, BPF_F_USER_STACK);

    correlation_events.perf_submit(ctx, &ev, sizeof(ev));

    return 0;
}
