import torch
from torch.utils.benchmark import Timer


def benchmark_empty_kernel(min_run_time: float = 1.0):
    """Measure pure synchronization overhead (no actual work)."""

    timer = Timer(
        stmt='torch.cuda.synchronize()',
        globals={'torch': torch},
        label='Kernel Launch',
        sub_label='empty',
        description='cuda.synchronize()'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    # Convert to microseconds for readability
    overhead_us = measurement.median * 1e6

    return measurement, overhead_us


def benchmark_small_kernel(size: int, min_run_time: float = 1.0):
    """Measure kernel launch overhead with minimal computation."""

    x = torch.ones(size, device='cuda')

    timer = Timer(
        stmt='x + 1',
        globals={'x': x},
        label='Kernel Launch',
        sub_label=f'size={size}',
        description='x + 1'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    overhead_us = measurement.median * 1e6

    return measurement, overhead_us


def benchmark_many_small_kernels(num_kernels: int, min_run_time: float = 1.0):
    """Measure overhead when launching many kernels sequentially."""

    x = torch.ones(1, device='cuda')

    def launch_many():
        for _ in range(num_kernels):
            x + 1  # Each triggers a kernel launch

    timer = Timer(
        stmt='launch_many()',
        globals={'launch_many': launch_many},
        label='Kernel Launch',
        sub_label=f'{num_kernels} kernels',
        description='sequential'
    )
    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    overhead_per_kernel_us = (measurement.median * 1e6) / num_kernels

    return measurement, overhead_per_kernel_us


if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("CUDA not available!")
        exit(1)

    print("=" * 60)
    print("Kernel Launch Overhead Test")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("=" * 60)

    print("\nEmpty kernel:")
    m, overhead = benchmark_empty_kernel(min_run_time=0.5)
    print(f"  Overhead: {overhead:.2f} µs")

    print("\nSmall kernels:")
    for size in [1, 10, 100]:
        m, overhead = benchmark_small_kernel(size, min_run_time=0.5)
        print(f"  size={size:3d}: {overhead:.2f} µs")

    print("\nSequential kernels:")
    for n in [10, 100]:
        m, overhead_per = benchmark_many_small_kernels(n, min_run_time=0.5)
        print(f"  {n:3d} kernels: {overhead_per:.2f} µs per kernel")