#include <uapi/linux/ptrace.h>
#include <linux/types.h>

#define MAX_STACK_ENTRIES 1024

enum cuda_api_kind {
    CUDA_API_UNKNOWN = 0,
    CUDA_API_LAUNCH_KERNEL = 1,
    CUDA_API_MEMCPY_ASYNC = 2,
    CUDA_API_STREAM_SYNC  = 3,
};

struct correlation_event {
    u64 timestamp_ns;
    u32 pid;
    u32 tid;
    u64 correlation_id;
    u32 api_kind;
    s32 stack_id;
};

BPF_STACK_TRACE(stack_traces, MAX_STACK_ENTRIES);
BPF_PERF_OUTPUT(correlation_events);

static __always_inline u32 get_pid(void) {
    return (u32)(bpf_get_current_pid_tgid() >> 32);
}

static __always_inline u32 get_tid(void) {
    return (u32)bpf_get_current_pid_tgid();
}

static __always_inline int emit_correlation_event(struct pt_regs *ctx, u32 api_kind) {

    struct correlation_event ev = {};

    ev.timestamp_ns = bpf_ktime_get_ns();
    ev.pid = get_pid();
    ev.tid = get_tid();
    ev.correlation_id = ev.timestamp_ns;
    ev.api_kind = api_kind;

    ev.stack_id = bpf_get_stackid(
        ctx,
        &stack_traces,
        BPF_F_USER_STACK
    );

    correlation_events.perf_submit(ctx, &ev, sizeof(ev));

    return 0;

}

int on_cudaLaunchKernel(struct pt_regs *ctx) {
    return emit_correlation_event(ctx, CUDA_API_LAUNCH_KERNEL);
}

int on_cudaMemcpyAsync(struct pt_regs *ctx) {
    return emit_correlation_event(ctx, CUDA_API_MEMCPY_ASYNC);
}

int on_cudaStreamSynchronize(struct pt_regs *ctx) {
    return emit_correlation_event(ctx, CUDA_API_STREAM_SYNC);
}
