import torch
from torch.utils.benchmark import Timer


def benchmark_host_to_device(num_elements: int, min_run_time: float = 1.0):
    """Benchmark CPU -> GPU transfer."""
    cpu_tensor = torch.randn(num_elements, dtype=torch.float32)

    timer = Timer(
        stmt='cpu_tensor.to("cuda")',
        globals={'cpu_tensor': cpu_tensor},
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

    timer = Timer(
        stmt='gpu_tensor. to("cpu")',
        globals={'gpu_tensor': gpu_tensor},
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

    timer = Timer(
        stmt='dst. copy_(src)',
        globals={'dst': dst, 'src': src},
        label='Memory Copy',
        sub_label=f'{num_elements:,} elements',
        description='Device→Device'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)

    bytes_transferred = num_elements * 4
    bandwidth_gbs = (bytes_transferred / measurement.median) / 1e9

    return measurement, bandwidth_gbs