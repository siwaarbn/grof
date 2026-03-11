"""
M2 T3 Week 3 — Py-spy Comparison Runner

Runs benchmarks under py-spy to measure its overhead and compare against
GROF's eBPF profiler. Generates results in the same JSON format as
run_suite.py for compatibility with attribution.py and comparison.py.

Usage:
    python run_pyspy.py                              # Run all CPU-only benchmarks
    python run_pyspy.py --benchmarks micro_gemm      # Specific benchmark
    python run_pyspy.py --iterations 30 --warmup 3   # Custom N
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add parent dir for imports
BENCHMARKS_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BENCHMARKS_DIR))

from stats import calculate_stats
from environment import get_environment

# Available CPU-only benchmarks (py-spy doesn't profile GPU)
CPU_BENCHMARKS = ["micro_gemm", "micro_launch", "resnet50", "bert"]

RESULTS_DIR = BENCHMARKS_DIR / "results"


def check_pyspy_installed() -> bool:
    """Check if py-spy is available."""
    return shutil.which("py-spy") is not None


def run_benchmark_under_pyspy(
    benchmark_name: str,
    iteration: int,
    svg_dir: Path,
) -> float:
    """
    Run a single benchmark iteration under py-spy.

    Returns wall-clock time in ms.
    """
    svg_path = svg_dir / f"pyspy_{benchmark_name}_iter{iteration}.svg"

    cmd = [
        "py-spy", "record",
        "--output", str(svg_path),
        "--format", "speedscope",
        "--rate", "100",
        "--nonblocking",
        "--",
        sys.executable,
        str(BENCHMARKS_DIR / "run_suite.py"),
        "--mode=baseline",
        f"--benchmarks={benchmark_name}",
        "--iterations=1",
        "--warmup=0",
    ]

    start = time.perf_counter()
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=600,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    if result.returncode != 0:
        # py-spy may need sudo
        print(f"    WARNING: py-spy exited with code {result.returncode}")
        if "permission" in result.stderr.lower() or "root" in result.stderr.lower():
            print("    TIP: Try running with sudo: sudo python run_pyspy.py")

    return elapsed_ms


def run_benchmark_baseline(benchmark_name: str) -> float:
    """Run a single benchmark iteration WITHOUT py-spy for comparison."""
    cmd = [
        sys.executable,
        str(BENCHMARKS_DIR / "run_suite.py"),
        "--mode=baseline",
        f"--benchmarks={benchmark_name}",
        "--iterations=1",
        "--warmup=0",
    ]

    start = time.perf_counter()
    subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    elapsed_ms = (time.perf_counter() - start) * 1000

    return elapsed_ms


def run_pyspy_comparison(
    benchmarks: List[str],
    iterations: int = 30,
    warmup: int = 3,
) -> Dict[str, Any]:
    """
    Run benchmarks both with and without py-spy to measure py-spy's overhead.

    Returns results dict compatible with run_suite.py JSON format.
    """
    # Create SVG output directory
    svg_dir = RESULTS_DIR / "pyspy_profiles"
    svg_dir.mkdir(parents=True, exist_ok=True)

    overhead_measurements = []

    for bench_name in benchmarks:
        print(f"\n{'='*60}")
        print(f"PY-SPY COMPARISON: {bench_name}")
        print(f"Warmup: {warmup}, Iterations: {iterations}")
        print(f"{'='*60}")

        # --- Baseline (no py-spy) ---
        print(f"\n  [Phase 1] Running WITHOUT py-spy...")
        baseline_times = []

        for i in range(warmup):
            print(f"    [Warmup {i+1}/{warmup}]...", end=" ", flush=True)
            t = run_benchmark_baseline(bench_name)
            print(f"{t:.2f} ms (discarded)")

        for i in range(iterations):
            print(f"    [Iter {i+1}/{iterations}]...", end=" ", flush=True)
            t = run_benchmark_baseline(bench_name)
            baseline_times.append(t)
            print(f"{t:.2f} ms")

        baseline_stats = calculate_stats(baseline_times)

        # --- With py-spy ---
        print(f"\n  [Phase 2] Running WITH py-spy...")
        pyspy_times = []

        for i in range(warmup):
            print(f"    [Warmup {i+1}/{warmup}]...", end=" ", flush=True)
            t = run_benchmark_under_pyspy(bench_name, f"warmup_{i}", svg_dir)
            print(f"{t:.2f} ms (discarded)")

        for i in range(iterations):
            print(f"    [Iter {i+1}/{iterations}]...", end=" ", flush=True)
            t = run_benchmark_under_pyspy(bench_name, i, svg_dir)
            pyspy_times.append(t)
            print(f"{t:.2f} ms")

        pyspy_stats = calculate_stats(pyspy_times)

        # Overhead calculation
        overhead_pct = 0.0
        if baseline_stats["mean"] > 0:
            overhead_pct = ((pyspy_stats["mean"] - baseline_stats["mean"])
                           / baseline_stats["mean"]) * 100

        print(f"\n  --- Results for {bench_name} ---")
        print(f"    Baseline mean: {baseline_stats['mean']:.2f} ms")
        print(f"    Py-spy mean:   {pyspy_stats['mean']:.2f} ms")
        print(f"    Overhead:      {overhead_pct:+.2f}%")

        overhead_measurements.append({
            "benchmark": bench_name,
            "mode": "py-spy",
            "warmup": warmup,
            "iterations": iterations,
            "times_ms": pyspy_times,
            "statistics": pyspy_stats,
            "baseline_times_ms": baseline_times,
            "baseline_statistics": baseline_stats,
            "overhead_pct": round(overhead_pct, 3),
        })

    # Compile report
    try:
        environment = get_environment()
    except Exception:
        environment = {"note": "Could not collect environment (no GPU?)"}

    report = {
        "environment": environment,
        "mode": "py-spy",
        "iterations": iterations,
        "warmup": warmup,
        "benchmarks_run": benchmarks,
        "results": [],
        "overhead_measurements": overhead_measurements,
        "timestamp": datetime.now().isoformat(),
    }

    # Save
    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = RESULTS_DIR / f"benchmark_py-spy_{ts}.json"

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Results saved to: {output_path}")
    print(f"SVG profiles in: {svg_dir}")
    print(f"{'='*60}")

    return report


def main():
    parser = argparse.ArgumentParser(
        description="M2 T3 Week 3: Run benchmarks under py-spy for comparison",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_pyspy.py                               # All CPU benchmarks
  python run_pyspy.py --benchmarks micro_gemm        # Only GEMM
  python run_pyspy.py --iterations 10 --warmup 1     # Quick test
  sudo python run_pyspy.py                           # If py-spy needs root
        """,
    )

    parser.add_argument(
        "--benchmarks", "-b", nargs="+",
        choices=CPU_BENCHMARKS, default=CPU_BENCHMARKS,
        help="Benchmarks to run (default: all)",
    )
    parser.add_argument(
        "--iterations", "-n", type=int, default=30,
        help="Number of measurement iterations (default: 30)",
    )
    parser.add_argument(
        "--warmup", "-w", type=int, default=3,
        help="Number of warmup iterations (default: 3)",
    )

    args = parser.parse_args()

    # Check py-spy
    if not check_pyspy_installed():
        print("ERROR: py-spy is not installed.")
        print("Install with:  pip install py-spy")
        sys.exit(1)

    print("=" * 60)
    print("M2 T3 Week 3 — Py-spy Overhead Comparison")
    print("=" * 60)

    run_pyspy_comparison(
        benchmarks=args.benchmarks,
        iterations=args.iterations,
        warmup=args.warmup,
    )


if __name__ == "__main__":
    main()
