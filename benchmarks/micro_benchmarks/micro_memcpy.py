import torch
from torch.utils.benchmark import Timer


def benchmark_host_to_device(num_elements: int, min_run_time: float = 1.0):
    """Benchmark CPU -> GPU transfer."""
    cpu_tensor = torch.randn(num_elements, dtype=torch.float32)

    def transfer():
        cpu_tensor.to("cuda")
        torch.cuda.synchronize()

    timer = Timer(
        stmt='transfer()',
        globals={'transfer': transfer},
        label='Memory Copy',
        sub_label=f'{num_elements:,} elements',
        description='Host→Device'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    # float32 = 4 bytes per element
    bytes_transferred = num_elements * 4
    bandwidth_gbs = (bytes_transferred / measurement.median) / 1e9

    return measurement, bandwidth_gbs


def benchmark_device_to_host(num_elements: int, min_run_time: float = 1.0):
    """Benchmark GPU -> CPU transfer."""
    gpu_tensor = torch.randn(num_elements, dtype=torch.float32, device='cuda')

    def transfer():
        gpu_tensor.to("cpu")
        torch.cuda.synchronize()

    timer = Timer(
        stmt='transfer()',
        globals={'transfer': transfer},
        label='Memory Copy',
        sub_label=f'{num_elements:,} elements',
        description='Device→Host'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    bytes_transferred = num_elements * 4
    bandwidth_gbs = (bytes_transferred / measurement.median) / 1e9

    return measurement, bandwidth_gbs


def benchmark_device_to_device(num_elements: int, min_run_time: float = 1.0):
    """Benchmark GPU -> GPU transfer (within same GPU)."""
    src = torch.randn(num_elements, dtype=torch.float32, device='cuda')
    dst = torch.empty(num_elements, dtype=torch.float32, device='cuda')

    def transfer():
        dst.copy_(src)
        torch.cuda.synchronize()

    timer = Timer(
        stmt='transfer()',
        globals={'transfer': transfer},
        label='Memory Copy',
        sub_label=f'{num_elements:,} elements',
        description='Device→Device'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    bytes_transferred = num_elements * 4
    bandwidth_gbs = (bytes_transferred / measurement.median) / 1e9

    return measurement, bandwidth_gbs


if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("CUDA not available!")
        exit(1)

    print("=" * 60)
    print("Memory Copy Benchmark Test")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("=" * 60)

    num_elements = 10_000_000  # 40 MB
    size_mb = (num_elements * 4) / 1e6

    print(f"\nSize: {num_elements:,} elements ({size_mb:.1f} MB)")

    m, bw = benchmark_host_to_device(num_elements, min_run_time=0.5)
    print(f"  Host→Device:   {bw:.2f} GB/s")

    m, bw = benchmark_device_to_host(num_elements, min_run_time=0.5)
    print(f"  Device→Host:   {bw:.2f} GB/s")

    m, bw = benchmark_device_to_device(num_elements, min_run_time=0.5)
    print(f"  Device→Device: {bw:.2f} GB/s")