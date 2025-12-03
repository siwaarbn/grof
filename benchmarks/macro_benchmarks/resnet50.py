import torch
from torchvision import models
from torch.utils.benchmark import Timer


def benchmark_resnet(batch_size: int, min_run_time: float = 1.0):
    """Benchmark ResNet50 inference throughput."""
    model = models.resnet50().cuda().eval()
    # ImageNet input: batch x 3 channels x 224x224 pixels
    x = torch.randn(batch_size, 3, 224, 224, device='cuda')

    timer = Timer(
        stmt='model(x)',
        globals={'model': model, 'x': x},
        label='ResNet50',
        sub_label=f'batch={batch_size}',
        description='inference'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)

    images_per_sec = batch_size / measurement.median

    return measurement, images_per_sec