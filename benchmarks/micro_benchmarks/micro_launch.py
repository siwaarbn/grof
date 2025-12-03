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

    # Build statement like: 'x + 1; x + 1; x + 1; ...'
    stmt = '; '.join(['x + 1'] * num_kernels)

    timer = Timer(
        stmt=stmt,
        globals={'x': x},
        label='Kernel Launch',
        sub_label=f'{num_kernels} kernels',
        description='sequential'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)

    # Average overhead per kernel
    overhead_per_kernel_us = (measurement.median * 1e6) / num_kernels

    return measurement, overhead_per_kernel_us