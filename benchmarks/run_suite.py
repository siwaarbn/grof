"""
Usage:
    python run_suite.py                          # Run all benchmarks
    python run_suite.py --benchmarks micro_gemm bert   # Run specific benchmarks
    python run_suite.py --output results/my.json # Custom output file
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path. abspath(__file__)))

from environment import get_environment
from config import BENCHMARK_CONFIG, RESULTS_DIR

# Import benchmark functions from your existing files
from micro_benchmarks.micro_gemm import benchmark_gemm
from micro_benchmarks. micro_memcpy import (
    benchmark_host_to_device,
    benchmark_device_to_host,
    benchmark_device_to_device,
)
from micro_benchmarks.micro_launch import (
    benchmark_empty_kernel,
    benchmark_small_kernel,
    benchmark_many_small_kernels,
)
from macro_benchmarks.resnet50 import benchmark_resnet
from macro_benchmarks.bert import benchmark_bert


def run_gemm_benchmarks(config: Dict) -> List[Dict]:
    """Run GEMM benchmarks for all configured sizes."""
    results = []
    print("\n" + "=" * 60)
    print("Running GEMM Benchmarks")
    print("=" * 60)

    for size in config["sizes"]:
        print(f"  Matrix size: {size}x{size}.. .", end=" ", flush=True)
        measurement, tflops = benchmark_gemm(size, config["min_run_time"])

        result = {
            "benchmark":  "gemm",
            "params": {"size": size},
            "median_ms": measurement. median * 1000,
            "iqr_ms": measurement.iqr * 1000,
            "tflops": tflops,
            "num_runs": len(measurement. times),
        }
        results.append(result)
        print(f"{measurement.median * 1000:.2f} ms, {tflops:.2f} TFLOPS")

    return results


def run_memory_benchmarks(config: Dict) -> List[Dict]:
    """Run memory copy benchmarks."""
    results = []
    print("\n" + "=" * 60)
    print("Running Memory Copy Benchmarks")
    print("=" * 60)

    for num_elements in config["num_elements"]:
        size_mb = (num_elements * 4) / 1e6
        print(f"\n  Size: {num_elements: ,} elements ({size_mb:.1f} MB)")

        # Host to Device
        print(f"    Host→Device.. .", end=" ", flush=True)
        m, bw = benchmark_host_to_device(num_elements, config["min_run_time"])
        results.append({
            "benchmark":  "memory_copy",
            "params":  {"direction": "host_to_device", "num_elements": num_elements},
            "median_ms": m.median * 1000,
            "iqr_ms":  m.iqr * 1000,
            "bandwidth_gbs": bw,
            "num_runs": len(m.times),
        })
        print(f"{bw:.2f} GB/s")

        # Device to Host
        print(f"    Device→Host...", end=" ", flush=True)
        m, bw = benchmark_device_to_host(num_elements, config["min_run_time"])
        results.append({
            "benchmark": "memory_copy",
            "params": {"direction":  "device_to_host", "num_elements": num_elements},
            "median_ms": m. median * 1000,
            "iqr_ms":  m.iqr * 1000,
            "bandwidth_gbs": bw,
            "num_runs": len(m.times),
        })
        print(f"{bw:.2f} GB/s")

        # Device to Device
        print(f"    Device→Device.. .", end=" ", flush=True)
        m, bw = benchmark_device_to_device(num_elements, config["min_run_time"])
        results.append({
            "benchmark": "memory_copy",
            "params": {"direction": "device_to_device", "num_elements": num_elements},
            "median_ms": m.median * 1000,
            "iqr_ms": m.iqr * 1000,
            "bandwidth_gbs": bw,
            "num_runs": len(m.times),
        })
        print(f"{bw:.2f} GB/s")

    return results


def run_kernel_launch_benchmarks(config: Dict) -> List[Dict]:
    """Run kernel launch overhead benchmarks."""
    results = []
    print("\n" + "=" * 60)
    print("Running Kernel Launch Benchmarks")
    print("=" * 60)

    # Empty kernel (synchronize only)
    print("  Empty sync.. .", end=" ", flush=True)
    m, overhead = benchmark_empty_kernel(config["min_run_time"])
    results.append({
        "benchmark": "kernel_launch",
        "params": {"type": "empty_sync"},
        "median_us": overhead,
        "iqr_us":  m.iqr * 1e6,
        "num_runs": len(m.times),
    })
    print(f"{overhead:.2f} µs")

    # Small kernels
    for size in config["small_kernel_sizes"]:
        print(f"  Small kernel (size={size})...", end=" ", flush=True)
        m, overhead = benchmark_small_kernel(size, config["min_run_time"])
        results.append({
            "benchmark": "kernel_launch",
            "params": {"type": "small_kernel", "size":  size},
            "median_us": overhead,
            "iqr_us":  m.iqr * 1e6,
            "num_runs": len(m.times),
        })
        print(f"{overhead:.2f} µs")

    # Many sequential kernels
    for n in config["num_kernels"]:
        print(f"  Sequential ({n} kernels)...", end=" ", flush=True)
        m, overhead_per = benchmark_many_small_kernels(n, config["min_run_time"])
        results.append({
            "benchmark":  "kernel_launch",
            "params":  {"type": "sequential", "num_kernels": n},
            "median_us_per_kernel": overhead_per,
            "total_median_ms": m.median * 1000,
            "num_runs": len(m. times),
        })
        print(f"{overhead_per:.2f} µs/kernel")

    return results


def run_resnet_benchmarks(config: Dict) -> List[Dict]:
    """Run ResNet50 benchmarks."""
    results = []
    print("\n" + "=" * 60)
    print("Running ResNet50 Benchmarks")
    print("=" * 60)

    for batch_size in config["batch_sizes"]:
        print(f"  Batch size:  {batch_size}...", end=" ", flush=True)
        m, throughput = benchmark_resnet(batch_size, config["min_run_time"])

        results.append({
            "benchmark": "resnet50",
            "params": {"batch_size": batch_size},
            "median_ms": m.median * 1000,
            "iqr_ms": m.iqr * 1000,
            "throughput_imgs_per_sec": throughput,
            "num_runs": len(m.times),
        })
        print(f"{m.median * 1000:.2f} ms, {throughput:.1f} img/s")

    return results


def run_bert_benchmarks(config: Dict) -> List[Dict]:
    """Run BERT benchmarks."""
    results = []
    print("\n" + "=" * 60)
    print("Running BERT Benchmarks")
    print("=" * 60)

    seq_length = config["seq_length"]

    for batch_size in config["batch_sizes"]:
        print(f"  Batch size:  {batch_size}, seq_len: {seq_length}...", end=" ", flush=True)
        m, throughput = benchmark_bert(batch_size, seq_length, config["min_run_time"])

        results.append({
            "benchmark": "bert",
            "params": {"batch_size": batch_size, "seq_length":  seq_length},
            "median_ms": m.median * 1000,
            "iqr_ms": m. iqr * 1000,
            "throughput_seqs_per_sec": throughput,
            "num_runs": len(m. times),
        })
        print(f"{m.median * 1000:.2f} ms, {throughput:.1f} seq/s")

    return results


# Registry of available benchmarks
BENCHMARK_RUNNERS = {
    "micro_gemm": run_gemm_benchmarks,
    "micro_memcpy": run_memory_benchmarks,
    "micro_launch": run_kernel_launch_benchmarks,
    "resnet50": run_resnet_benchmarks,
    "bert": run_bert_benchmarks,
}


def run_suite(
    benchmarks: Optional[List[str]] = None,
    output_file: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run the complete benchmark suite.

    Args:
        benchmarks: List of benchmark names to run (None = all)
        output_file: Path to save JSON results (None = auto-generate)

    Returns:
        Dictionary with environment info and all results
    """
    import torch

    # Check CUDA availability
    if not torch.cuda. is_available():
        print("ERROR: CUDA is not available!")
        sys.exit(1)

    # Determine which benchmarks to run
    if benchmarks is None:
        benchmarks = list(BENCHMARK_RUNNERS. keys())

    # Validate benchmark names
    for name in benchmarks:
        if name not in BENCHMARK_RUNNERS:
            print(f"ERROR: Unknown benchmark '{name}'")
            print(f"Available:  {list(BENCHMARK_RUNNERS.keys())}")
            sys.exit(1)

    # Collect environment info
    print("=" * 60)
    print("GROF Benchmark Suite")
    print("=" * 60)
    print("\nCollecting environment information...")
    environment = get_environment()
    print(f"  GPU: {environment['gpu']['device_name']}")
    print(f"  PyTorch: {environment['pytorch_version']}")
    print(f"  CUDA: {environment['gpu']['cuda_version']}")

    # Run benchmarks
    all_results = []
    for name in benchmarks:
        runner = BENCHMARK_RUNNERS[name]
        config = BENCHMARK_CONFIG[name]
        results = runner(config)
        all_results.extend(results)

    # Compile final report
    report = {
        "environment": environment,
        "benchmarks_run": benchmarks,
        "results": all_results,
    }

    # Save results
    script_dir = os.path.dirname(os.path.abspath(__file__))
    results_dir = os.path. join(script_dir, RESULTS_DIR)
    os.makedirs(results_dir, exist_ok=True)

    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path. join(results_dir, f"benchmark_{timestamp}.json")

    with open(output_file, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print(f"Results saved to: {output_file}")
    print("=" * 60)

    return report


def main():
    parser = argparse.ArgumentParser(
        description="GROF Benchmark Suite Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--benchmarks", "-b",
        nargs="+",
        choices=list(BENCHMARK_RUNNERS.keys()),
        help="Specific benchmarks to run (default: all)"
    )

    parser.add_argument(
        "--output", "-o",
        type=str,
        help="Output JSON file path"
    )

    args = parser.parse_args()

    run_suite(
        benchmarks=args.benchmarks,
        output_file=args.output,
    )


if __name__ == "__main__":
    main()