"""Collect system environment information for reproducibility."""

import torch
import platform
import subprocess
from datetime import datetime
from typing import Dict, Any


def get_gpu_info() -> Dict[str, Any]:
    """Get GPU information using torch and nvidia-smi."""
    if not torch.cuda.is_available():
        return {"available": False}

    return {
        "available": True,
        "device_name": torch.cuda. get_device_name(0),
        "device_count": torch.cuda. device_count(),
        "cuda_version": torch. version.cuda,
        "cudnn_version": torch.backends.cudnn.version(),
        "memory_total_gb": round(torch.cuda. get_device_properties(0).total_memory / 1e9, 2),
    }


def get_driver_version() -> str:
    """Get NVIDIA driver version from nvidia-smi."""
    try:
        result = subprocess. run(
            ["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except FileNotFoundError:
        return "unknown"


def get_environment() -> Dict[str, Any]:
    """Collect complete environment information."""
    return {
        "timestamp": datetime.now().isoformat(),
        "python_version": platform.python_version(),
        "pytorch_version": torch.__version__,
        "os":  platform.system(),
        "os_version": platform.release(),
        "cpu":  platform.processor(),
        "gpu":  get_gpu_info(),
        "driver_version": get_driver_version(),
    }


if __name__ == "__main__":
    import json
    env = get_environment()
    print(json.dumps(env, indent=2))