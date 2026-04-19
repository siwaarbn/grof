#include <uapi/linux/ptrace.h>

/*
 * BPF map storing correlation IDs per thread.
 *
 * Key:   u32  -> Thread ID (TID)
 * Value: u64  -> Correlation ID
 */
BPF_HASH(cuda_correlation_map, u32, u64);



/*
 * Uprobe handler executed on CUDA Runtime API entry.
 */
int on_cuda_runtime_entry(struct pt_regs *ctx)
{
    u32 tid = (u32)bpf_get_current_pid_tgid();
    u64 correlation_id = bpf_ktime_get_ns();
    cuda_correlation_map.update(&tid, &correlation_id);
    return 0;
}
