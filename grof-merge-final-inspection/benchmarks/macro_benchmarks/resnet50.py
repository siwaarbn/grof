import torch
from torchvision import models
from torch.utils.benchmark import Timer

def set_seed(seed: int = 42):
    """Ensure reproducible results."""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def benchmark_resnet(batch_size: int, min_run_time: float = 1.0):
    """Benchmark ResNet50 inference throughput."""
    set_seed(42)
    model = models.resnet50().cuda().eval()
    # ImageNet input: batch x 3 channels x 224x224 pixels
    x = torch.randn(batch_size, 3, 224, 224, device='cuda')

    with torch.no_grad():
        model(x)

    timer = Timer(
        stmt='with torch.no_grad(): model(x)',
        globals={
            'model': model,
            'x': x,
            'torch': torch
        },
        label='ResNet50',
        sub_label=f'batch={batch_size}',
        description='inference'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    images_per_sec = batch_size / measurement.median

    return measurement, images_per_sec


if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("CUDA not available!")
        exit(1)

    print("=" * 60)
    print("ResNet50 Benchmark Test")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("=" * 60)

    for batch_size in [1, 8, 32]:
        print(f"\nBatch size: {batch_size}")
        m, ips = benchmark_resnet(batch_size, min_run_time=0.5)
        print(f"  Time: {m.median * 1000:.2f} ms")
        print(f"  Throughput: {ips:.1f} images/sec")