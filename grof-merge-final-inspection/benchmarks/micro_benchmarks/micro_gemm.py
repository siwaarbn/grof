import torch
from torch.utils.benchmark import Timer


def benchmark_gemm(size: int, min_run_time: float = 1.0):
    """Benchmark matrix multiplication (GEMM) on GPU."""

    # Create random matrices on GPU
    # Use explicit dtype for consistency
    A = torch.randn(size, size, device='cuda', dtype=torch.float32)
    B = torch.randn(size, size, device='cuda', dtype=torch.float32)

    timer = Timer(
        stmt='torch.mm(A, B)',
        globals={'torch': torch, 'A': A, 'B': B},
        label='GEMM',
        sub_label=f'{size}x{size}',
        description='torch.mm'
    )
    measurement = timer.blocked_autorange(min_run_time=min_run_time)

    # FLOPS calculation for C = A @ B where A, B are NxN:
    # Each output element requires N multiplications + N additions = 2N ops
    # Total elements: N^2, so total FLOPS = N^2 * 2N = 2N^3
    flops = 2 * (size ** 3)
    tflops = (flops / measurement.median) / 1e12

    return measurement, tflops


if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("CUDA not available!")
        exit(1)

    print("=" * 60)
    print("GEMM Benchmark Test")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("=" * 60)

    for size in [512, 1024, 2048]:
        m, tflops = benchmark_gemm(size, min_run_time=0.5)
        print(f"\n{size}x{size}:")
        print(f"  Time: {m.median * 1000:.2f} ms")
        print(f"  TFLOPS: {tflops:.2f}")