#include <uapi/linux/ptrace.h>
#include <linux/types.h>

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
};

BPF_HASH(cuda_correlation_map, u32, u64);
BPF_PERF_OUTPUT(correlation_events);

// helper
static __always_inline u32 get_pid() {
    return (u32)(bpf_get_current_pid_tgid() >> 32);
}

static __always_inline u32 get_tid() {
    return (u32)bpf_get_current_pid_tgid();
}

static __always_inline void emit_event(struct pt_regs *ctx, u32 api_kind) {
    u32 pid = get_pid();
    u32 tid = get_tid();

    u64 corr = bpf_ktime_get_ns();  // Week 2 still uses timestamp as ID
    cuda_correlation_map.update(&tid, &corr);

    struct correlation_event ev = {};
    ev.timestamp_ns = corr;
    ev.pid = pid;
    ev.tid = tid;
    ev.correlation_id = corr;
    ev.api_kind = api_kind;

    correlation_events.perf_submit(ctx, &ev, sizeof(ev));
}

int on_cudaLaunchKernel(struct pt_regs *ctx) {
    emit_event(ctx, CUDA_API_LAUNCH_KERNEL);
    return 0;
}

int on_cudaMemcpyAsync(struct pt_regs *ctx) {
    emit_event(ctx, CUDA_API_MEMCPY_ASYNC);
    return 0;
}

int on_cudaStreamSynchronize(struct pt_regs *ctx) {
    emit_event(ctx, CUDA_API_STREAM_SYNC);
    return 0;
}
