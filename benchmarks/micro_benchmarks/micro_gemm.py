import torch
from torch.utils.benchmark import Timer


def benchmark_gemm(size: int, min_run_time: float = 1.0):
    """Benchmark matrix multiplication (GEMM) on GPU."""
    
    # Create random matrices on GPU
    A = torch.randn(size, size, device='cuda', dtype=torch.float32)
    B = torch.randn(size, size, device='cuda', dtype=torch.float32)

    timer = Timer(
        stmt='torch. mm(A, B)',
        globals={'torch': torch, 'A': A, 'B': B},
        label='GEMM',
        sub_label=f'{size}x{size}',
        description='torch.mm'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    # FLOPS = 2 * N^3 for matrix multiplication (N multiplications + N additions per element)
    flops = 2 * (size ** 3)
    tflops = (flops / measurement.median) / 1e12

    return measurement, tflops