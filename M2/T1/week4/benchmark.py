#!/usr/bin/env python3
"""
M2 T1 Week 4 – Overhead Benchmark Script

Measures the CPU overhead introduced by the GROF eBPF correlation profiler.
Run this on a CUDA-enabled Linux machine with the T1 eBPF stack installed.

Usage:
    python3 benchmark.py [--duration 30] [--workload "python3 workload.py"]

Output:
    week4_overhead_report.json
"""

import argparse
import subprocess
import time
import json
import os
import sys

REPORT_FILE = "week4_overhead_report.json"

def run_workload(cmd, duration_s, env=None):
    """Run a workload for `duration_s` seconds, return wall-clock time."""
    start = time.perf_counter()
    proc = subprocess.Popen(
        cmd, shell=True, env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        proc.wait(timeout=duration_s)
    except subprocess.TimeoutExpired:
        proc.terminate()
        proc.wait()
    end = time.perf_counter()
    return end - start


def check_prerequisites():
    """Check that BCC and CUDA are available."""
    errors = []

    try:
        import bcc  # noqa: F401
    except ImportError:
        errors.append("BCC not available: install python3-bcc")

    cuda_lib = os.path.exists("/dev/nvidia0") or os.path.exists("/dev/nvidiactl")
    if not cuda_lib:
        errors.append("No NVIDIA GPU device found (/dev/nvidia0 missing) — overhead numbers will be CPU-only")

    return errors


def main():
    parser = argparse.ArgumentParser(description="GROF T1 Overhead Benchmark")
    parser.add_argument("--duration", type=int, default=30,
                        help="Duration (seconds) for each measurement run (default: 30)")
    parser.add_argument("--workload", type=str,
                        default="python3 -c \"import time; [time.sleep(0.001) for _ in range(100000)]\"",
                        help="Shell command to use as the workload under test")
    parser.add_argument("--runs", type=int, default=3,
                        help="Number of repeated measurements per variant (default: 3)")
    args = parser.parse_args()

    print("=" * 60)
    print("GROF M2 T1 – Week 4 Overhead Benchmark")
    print("=" * 60)

    warnings = check_prerequisites()
    for w in warnings:
        print(f"[WARN] {w}")

    print(f"\nWorkload : {args.workload}")
    print(f"Duration : {args.duration}s per run")
    print(f"Runs     : {args.runs} per variant\n")

    # --- Baseline (no profiler) ---
    print("[1/2] Running BASELINE (no profiler)...")
    baseline_times = []
    for i in range(args.runs):
        t = run_workload(args.workload, args.duration)
        baseline_times.append(t)
        print(f"  Run {i+1}: {t:.3f}s")
    baseline_avg = sum(baseline_times) / len(baseline_times)
    print(f"  → Average: {baseline_avg:.3f}s\n")

    # --- With profiler ---
    print("[2/2] Running WITH GROF eBPF profiler (sudo required)...")
    profiler_cmd = f"sudo python3 {os.path.dirname(os.path.abspath(__file__))}/../week3/correlation_stacks.py"
    profiler_proc = subprocess.Popen(
        profiler_cmd, shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(2)  # Give profiler time to attach

    profiler_times = []
    for i in range(args.runs):
        t = run_workload(args.workload, args.duration)
        profiler_times.append(t)
        print(f"  Run {i+1}: {t:.3f}s")

    # Stop profiler
    profiler_proc.terminate()
    profiler_proc.wait()

    profiler_avg = sum(profiler_times) / len(profiler_times)
    print(f"  → Average: {profiler_avg:.3f}s\n")

    # --- Report ---
    overhead_pct = ((profiler_avg - baseline_avg) / baseline_avg) * 100
    passed = overhead_pct < 5.0

    report = {
        "workload": args.workload,
        "duration_per_run_s": args.duration,
        "runs": args.runs,
        "baseline_avg_s": round(baseline_avg, 4),
        "profiler_avg_s": round(profiler_avg, 4),
        "overhead_pct": round(overhead_pct, 2),
        "target_pct": 5.0,
        "passed": passed,
        "baseline_runs_s": baseline_times,
        "profiler_runs_s": profiler_times,
    }

    with open(REPORT_FILE, "w") as f:
        json.dump(report, f, indent=2)

    print("=" * 60)
    print(f"Overhead  : {overhead_pct:.2f}%  (target: <5%)")
    print(f"Result    : {'✅ PASS' if passed else '❌ FAIL — overhead exceeds 5% target'}")
    print(f"Report    : {REPORT_FILE}")
    print("=" * 60)

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
