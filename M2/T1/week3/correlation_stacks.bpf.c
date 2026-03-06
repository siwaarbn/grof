#include <uapi/linux/ptrace.h>
#include <linux/types.h>

enum cuda_api_kind {
    CUDA_API_UNKNOWN = 0,
};

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
    return (u32)(bpf_get_current_pid_tgid() >> 32);
}

static __always_inline u32 get_tid() {
    return (u32)bpf_get_current_pid_tgid();
}

static __always_inline void emit_event(struct pt_regs *ctx, u32 api_kind) {
    u32 pid = get_pid();
    u32 tid = get_tid();
    u64 ts = bpf_ktime_get_ns();

    s32 stack_id = stack_traces.get_stackid(ctx, BPF_F_USER_STACK);

    struct correlation_event ev = {};
    ev.timestamp_ns = ts;
    ev.pid = pid;
    ev.tid = tid;
    ev.correlation_id = ts;
    ev.api_kind = api_kind;
    ev.stack_id = stack_id;

    correlation_events.perf_submit(ctx, &ev, sizeof(ev));
}

int on_init_grof(struct pt_regs *ctx) {
    emit_event(ctx, CUDA_API_UNKNOWN);
    return 0;
}
