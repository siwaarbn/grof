"""
GROF Benchmark Suite Runner

M1 T3: Basic automation and benchmark execution
M2 T3: Extended with --mode, --iterations, --warmup for overhead analysis

Usage:
    python run_suite.py                                    # Run all (baseline)
    python run_suite.py --mode=baseline --iterations=30    # M2 T3 overhead test
    python run_suite.py --mode=grof -b resnet50 -n 30      # With GROF profiler
    python run_suite.py --mode=nsys --benchmarks micro_gemm # With Nsight Systems
"""

import argparse
import json
import os
import resource
import sys
import subprocess
import time
import signal
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from environment import get_environment
from config import BENCHMARK_CONFIG, RESULTS_DIR

# Import benchmark functions
from micro_benchmarks.micro_gemm import benchmark_gemm
from micro_benchmarks.micro_memcpy import (
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

# =============================================================================
# M2 T3: PROFILER INTEGRATION
# =============================================================================

# Paths to T1 and T2 components
PROJECT_ROOT = Path(__file__).parent.parent
# M2 T1 Week 3: Most advanced eBPF profiler with CUDA correlation + stack resolution
EBPF_SCRIPT = PROJECT_ROOT / "M2" / "T1" / "week3" / "correlation_stacks.py"
# Fallback to M1 T1 if M2 version not available
EBPF_SCRIPT_FALLBACK = PROJECT_ROOT / "M1" / "T1" / "week2" / "stackwalk.py"
CUPTI_LIB = PROJECT_ROOT / "libgrof_cuda.so"
INGEST_SCRIPT = PROJECT_ROOT / "backend" / "ingest.py"


# =============================================================================
# M3 T3: GROF PIPELINE INTEGRATION
# =============================================================================


class GrofPipeline:
    """
    Integrates a benchmark run with the full GROF backend pipeline:
    session creation → profiling → trace ingest → session URL output.

    Activated via --ingest combined with --mode=grof. Mirrors the workflow
    of trace.sh for structured benchmark workloads.

    Usage:
        pipeline = GrofPipeline(api_base, ui_base, output_dir, session_name)
        pipeline.create_session()
        # ... run benchmarks with ProfilerContext ...
        pipeline.stop_session()
        pipeline.ingest_traces()
        pipeline.print_url()
    """

    def __init__(
        self,
        api_base: str,
        ui_base: str,
        output_dir: Path,
        session_name: str,
    ) -> None:
        self.api_base = api_base.rstrip("/")
        self.ui_base = ui_base.rstrip("/")
        self.output_dir = output_dir
        self.session_name = session_name
        self.session_id: Optional[int] = None

    def create_session(self) -> int:
        """POST /api/v1/sessions/start?name=... → returns session_id."""
        import urllib.request
        import urllib.parse

        url = (
            f"{self.api_base}/api/v1/sessions/start"
            f"?name={urllib.parse.quote(self.session_name)}"
        )
        req = urllib.request.Request(url, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        self.session_id = data["session_id"]
        print(f"[Pipeline] Session created: #{self.session_id} ({self.session_name})")
        return self.session_id

    def stop_session(self) -> None:
        """POST /api/v1/sessions/stop/{session_id}."""
        if self.session_id is None:
            return
        import urllib.request

        url = f"{self.api_base}/api/v1/sessions/stop/{self.session_id}"
        req = urllib.request.Request(url, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10):
                pass
            print(f"[Pipeline] Session #{self.session_id} stopped")
        except Exception as e:
            print(f"[Pipeline] WARNING: stop_session failed: {e}")

    def ingest_traces(self) -> bool:
        """Run ingest.py to upload CPU and GPU trace files for the current session."""
        if not INGEST_SCRIPT.exists():
            print(f"[Pipeline] WARNING: {INGEST_SCRIPT} not found — skipping ingest")
            return False
        if self.session_id is None:
            print("[Pipeline] WARNING: no session_id — skipping ingest")
            return False

        cmd = [
            sys.executable, str(INGEST_SCRIPT),
            "--session-id", str(self.session_id),
            "--api", self.api_base,
        ]

        cpu_file = self.output_dir / "cpu_correlation_with_stack.json"
        gpu_file = self.output_dir / "gpu_trace.json"

        if cpu_file.exists():
            cmd += ["--cpu", str(cpu_file)]
            print(f"[Pipeline] Found CPU trace: {cpu_file}")
        if gpu_file.exists():
            cmd += ["--gpu", str(gpu_file)]
            print(f"[Pipeline] Found GPU trace: {gpu_file}")

        if "--cpu" not in cmd and "--gpu" not in cmd:
            print("[Pipeline] WARNING: no trace files found in output dir — nothing to ingest")
            return False

        print("[Pipeline] Uploading traces...")
        result = subprocess.run(cmd)
        if result.returncode != 0:
            print(f"[Pipeline] WARNING: ingest exited with code {result.returncode}")
        return result.returncode == 0

    def session_url(self) -> str:
        return f"{self.ui_base}/session/{self.session_id}/correlated"

    def print_url(self) -> str:
        url = self.session_url()
        print("\n" + "=" * 60)
        print(f"Tracing complete: {self.session_name}")
        print(f"View traces: {url}")
        print("=" * 60)
        return url


def validate_pipeline(api_base: str, ui_base: str) -> bool:
    """
    End-to-end pipeline smoke test: create session → verify it appears in list
    → stop session → confirm URL format.

    Does not run GPU benchmarks. Safe for CI or pre-flight checks.
    Returns True only if all checks pass.
    """
    import urllib.request
    import urllib.parse

    api_base = api_base.rstrip("/")
    print("\n" + "=" * 60)
    print("GROF PIPELINE VALIDATION")
    print(f"Backend: {api_base}  |  UI: {ui_base}")
    print("=" * 60)

    checks: List[Dict[str, Any]] = []
    session_id: Optional[int] = None

    # ── Check 1: create session ───────────────────────────────────────────────
    try:
        url = f"{api_base}/api/v1/sessions/start?name=validation_run"
        req = urllib.request.Request(url, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        session_id = data["session_id"]
        checks.append({"check": "create_session", "status": "PASS", "session_id": session_id})
        print(f"  [PASS] create_session → #{session_id}")
    except Exception as exc:
        checks.append({"check": "create_session", "status": "FAIL", "error": str(exc)})
        print(f"  [FAIL] create_session: {exc}")

    # ── Check 2: session appears in list ─────────────────────────────────────
    if session_id is not None:
        try:
            with urllib.request.urlopen(f"{api_base}/api/v1/sessions", timeout=10) as resp:
                sessions = json.loads(resp.read().decode())
            found = any(s["id"] == session_id for s in sessions)
            if found:
                checks.append({"check": "session_in_list", "status": "PASS"})
                print(f"  [PASS] session_in_list → #{session_id} found")
            else:
                checks.append({
                    "check": "session_in_list", "status": "FAIL",
                    "detail": f"#{session_id} absent from {[s['id'] for s in sessions[:5]]}",
                })
                print(f"  [FAIL] session_in_list → #{session_id} not found")
        except Exception as exc:
            checks.append({"check": "session_in_list", "status": "FAIL", "error": str(exc)})
            print(f"  [FAIL] session_in_list: {exc}")

    # ── Check 3: stop session ─────────────────────────────────────────────────
    if session_id is not None:
        try:
            req = urllib.request.Request(
                f"{api_base}/api/v1/sessions/stop/{session_id}", method="POST"
            )
            with urllib.request.urlopen(req, timeout=10):
                pass
            checks.append({"check": "stop_session", "status": "PASS"})
            print(f"  [PASS] stop_session → #{session_id}")
        except Exception as exc:
            checks.append({"check": "stop_session", "status": "FAIL", "error": str(exc)})
            print(f"  [FAIL] stop_session: {exc}")

    # ── Check 4: URL format ───────────────────────────────────────────────────
    if session_id is not None:
        session_url = f"{ui_base}/session/{session_id}/correlated"
        checks.append({"check": "url_format", "status": "PASS", "url": session_url})
        print(f"  [PASS] url_format → {session_url}")

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for c in checks if c["status"] == "PASS")
    total = len(checks)
    all_passed = passed == total

    print(f"\n{'=' * 60}")
    print(f"Result: {passed}/{total} checks passed")
    if all_passed:
        print("Pipeline validation PASSED")
    else:
        print("Pipeline validation FAILED")
        for c in checks:
            if c["status"] != "PASS":
                print(f"  - {c['check']}: {c.get('error', c.get('detail', ''))}")
    print("=" * 60)

    return all_passed


class ProfilerContext:
    """
    Context manager for running with different profilers.

    M2 T3 Week 2: Extended with per-component modes for overhead attribution.
      - baseline:   No profiling (pure baseline)
      - grof:       Full system (eBPF + CUPTI)
      - nsys:       NVIDIA Nsight Systems
      - ebpf-only:  Only eBPF CPU profiler (no CUPTI GPU tracing)
      - cupti-only: Only CUPTI GPU tracing (no eBPF CPU profiler)
    """

    def __init__(self, mode: str, output_dir: "Path | None" = None):
        self.mode = mode
        self.output_dir = output_dir or Path("/tmp/grof")
        self.ebpf_proc = None
        self.original_env = os.environ.copy()

    def _resolve_ebpf_script(self) -> Path:
        """Find the best available eBPF script."""
        if EBPF_SCRIPT.exists():
            return EBPF_SCRIPT
        if EBPF_SCRIPT_FALLBACK.exists():
            return EBPF_SCRIPT_FALLBACK
        return EBPF_SCRIPT  # will trigger "not found" warning

    def _start_ebpf(self, label: str) -> None:
        """Start eBPF profiler subprocess (requires Linux + root)."""
        script = self._resolve_ebpf_script()
        if script.exists() and sys.platform == "linux":
            try:
                output_file = str(self.output_dir / "cpu_correlation_with_stack.json")
                self.ebpf_proc = subprocess.Popen(
                    ["sudo", "/usr/bin/python3", str(script),
                     "--output", output_file],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=str(script.parent),
                )
                print(f"[Mode: {label}] eBPF profiler started (PID: {self.ebpf_proc.pid})")
                print(f"[Mode: {label}] Script: {script}")
                time.sleep(3)  # wait for BPF to compile and attach uprobes
            except Exception as e:
                print(f"[Mode: {label}] WARNING: eBPF failed to start: {e}")
        else:
            reason = "requires Linux" if sys.platform != "linux" else f"{script} not found"
            print(f"[Mode: {label}] WARNING: eBPF not available ({reason})")

    def _enable_cupti(self, label: str) -> None:
        """Enable CUPTI GPU tracing via LD_PRELOAD."""
        if CUPTI_LIB.exists():
            os.environ["LD_PRELOAD"] = str(CUPTI_LIB)
            print(f"[Mode: {label}] CUPTI enabled via LD_PRELOAD: {CUPTI_LIB}")
        else:
            print(f"[Mode: {label}] WARNING: {CUPTI_LIB} not found, CUPTI disabled")

    def __enter__(self):
        if self.mode == "baseline":
            print("[Mode: BASELINE] No profiler attached")

        elif self.mode == "grof":
            # Full system: both CUPTI and eBPF
            self._enable_cupti("GROF")
            self._start_ebpf("GROF")

        elif self.mode == "ebpf-only":
            # M2 T3 Week 2: Only eBPF CPU profiler, NO CUPTI
            print("[Mode: EBPF-ONLY] CPU profiling only (no GPU tracing)")
            self._start_ebpf("EBPF-ONLY")

        elif self.mode == "cupti-only":
            # M2 T3 Week 2: Only CUPTI GPU tracing, NO eBPF
            print("[Mode: CUPTI-ONLY] GPU tracing only (no CPU profiling)")
            self._enable_cupti("CUPTI-ONLY")

        elif self.mode == "nsys":
            print("[Mode: NSYS] Running under Nsight Systems")
            # Note: nsys wrapping is handled externally

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Cleanup eBPF subprocess
        if self.ebpf_proc:
            try:
                self.ebpf_proc.send_signal(signal.SIGINT)
                self.ebpf_proc.wait(timeout=5)
            except (subprocess.TimeoutExpired, ProcessLookupError):
                self.ebpf_proc.kill()
                self.ebpf_proc.wait()
            print(f"[Mode: {self.mode.upper()}] eBPF profiler stopped")

        # Restore environment
        os.environ.clear()
        os.environ.update(self.original_env)
        return False


# =============================================================================
# M2 T3: STATISTICS (from stats.py, inlined)
# =============================================================================

def calculate_stats(data: List[float]) -> Dict[str, Any]:
    """Calculate mean, std, and 95% confidence interval."""
    import numpy as np
    from scipy import stats as scipy_stats

    arr = np.array(data)
    n = len(arr)

    if n < 2:
        return {"n": n, "mean": float(arr[0]) if n else 0, "std": 0,
                "ci95_lower": 0, "ci95_upper": 0}

    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1))
    sem = scipy_stats.sem(arr)
    ci95 = sem * scipy_stats.t.ppf(0.975, n - 1)

    return {
        "n": n, "mean": mean, "std": std,
        "ci95_lower": mean - ci95, "ci95_upper": mean + ci95,
    }


def get_peak_memory_mb() -> float:
    """
    Get current process peak memory (RSS) in MB.
    Uses resource.getrusage for in-process measurement.
    On macOS ru_maxrss is in bytes; on Linux it is in KB.
    """
    usage = resource.getrusage(resource.RUSAGE_SELF)
    if sys.platform == "darwin":
        return usage.ru_maxrss / (1024 * 1024)  # bytes -> MB
    else:
        return usage.ru_maxrss / 1024  # KB -> MB


# =============================================================================
# BENCHMARK RUNNERS
# =============================================================================

def run_gemm_benchmarks(config: Dict) -> List[Dict]:
    """Run GEMM benchmarks for all configured sizes."""
    results = []
    print("\n" + "=" * 60)
    print("Running GEMM Benchmarks")
    print("=" * 60)

    for size in config["sizes"]:
        print(f"  Matrix size: {size}x{size}...", end=" ", flush=True)
        measurement, tflops = benchmark_gemm(size, config["min_run_time"])

        result = {
            "benchmark": "gemm",
            "params": {"size": size},
            "median_ms": measurement.median * 1000,
            "iqr_ms": measurement.iqr * 1000,
            "tflops": tflops,
            "num_runs": len(measurement.times),
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
        print(f"\n  Size: {num_elements:,} elements ({size_mb:.1f} MB)")

        # Host to Device
        print(f"    Host→Device...", end=" ", flush=True)
        m, bw = benchmark_host_to_device(num_elements, config["min_run_time"])
        results.append({
            "benchmark": "memory_copy",
            "params": {"direction": "host_to_device", "num_elements": num_elements},
            "median_ms": m.median * 1000,
            "iqr_ms": m.iqr * 1000,
            "bandwidth_gbs": bw,
            "num_runs": len(m.times),
        })
        print(f"{bw:.2f} GB/s")

        # Device to Host
        print(f"    Device→Host...", end=" ", flush=True)
        m, bw = benchmark_device_to_host(num_elements, config["min_run_time"])
        results.append({
            "benchmark": "memory_copy",
            "params": {"direction": "device_to_host", "num_elements": num_elements},
            "median_ms": m.median * 1000,
            "iqr_ms": m.iqr * 1000,
            "bandwidth_gbs": bw,
            "num_runs": len(m.times),
        })
        print(f"{bw:.2f} GB/s")

        # Device to Device
        print(f"    Device→Device...", end=" ", flush=True)
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

    # Empty kernel
    print("  Empty sync...", end=" ", flush=True)
    m, overhead = benchmark_empty_kernel(config["min_run_time"])
    results.append({
        "benchmark": "kernel_launch",
        "params": {"type": "empty_sync"},
        "median_us": overhead,
        "iqr_us": m.iqr * 1e6,
        "num_runs": len(m.times),
    })
    print(f"{overhead:.2f} µs")

    # Small kernels
    for size in config["small_kernel_sizes"]:
        print(f"  Small kernel (size={size})...", end=" ", flush=True)
        m, overhead = benchmark_small_kernel(size, config["min_run_time"])
        results.append({
            "benchmark": "kernel_launch",
            "params": {"type": "small_kernel", "size": size},
            "median_us": overhead,
            "iqr_us": m.iqr * 1e6,
            "num_runs": len(m.times),
        })
        print(f"{overhead:.2f} µs")

    # Many sequential kernels
    for n in config["num_kernels"]:
        print(f"  Sequential ({n} kernels)...", end=" ", flush=True)
        m, overhead_per = benchmark_many_small_kernels(n, config["min_run_time"])
        results.append({
            "benchmark": "kernel_launch",
            "params": {"type": "sequential", "num_kernels": n},
            "median_us_per_kernel": overhead_per,
            "total_median_ms": m.median * 1000,
            "num_runs": len(m.times),
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
        print(f"  Batch size: {batch_size}...", end=" ", flush=True)
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
        print(f"  Batch size: {batch_size}, seq_len: {seq_length}...", end=" ", flush=True)
        m, throughput = benchmark_bert(batch_size, seq_length, config["min_run_time"])

        results.append({
            "benchmark": "bert",
            "params": {"batch_size": batch_size, "seq_length": seq_length},
            "median_ms": m.median * 1000,
            "iqr_ms": m.iqr * 1000,
            "throughput_seqs_per_sec": throughput,
            "num_runs": len(m.times),
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


# =============================================================================
# M2 T3: OVERHEAD MEASUREMENT WITH WARMUP + ITERATIONS
# =============================================================================

def run_single_iteration(benchmark_name: str, config: Dict) -> float:
    """Run a single benchmark iteration, return total time in ms."""
    import torch
    
    start = time.perf_counter()
    torch.cuda.synchronize()
    
    runner = BENCHMARK_RUNNERS[benchmark_name]
    runner(config)
    
    torch.cuda.synchronize()
    elapsed = time.perf_counter() - start
    
    return elapsed * 1000  # ms


def run_overhead_measurement(
    benchmark_name: str,
    mode: str,
    iterations: int,
    warmup: int,
) -> Dict[str, Any]:
    """
    Run benchmark with warmup and multiple iterations for overhead analysis.
    M2 T3 Week 1: Sample size N=30, warmup=3
    M2 T3 Week 2: Added per-iteration memory tracking
    """
    config = BENCHMARK_CONFIG[benchmark_name]
    times = []
    memory_samples = []

    print(f"\n{'='*60}")
    print(f"OVERHEAD MEASUREMENT: {benchmark_name}")
    print(f"Mode: {mode}, Warmup: {warmup}, Iterations: {iterations}")
    print(f"{'='*60}")

    with ProfilerContext(mode):
        # Warmup phase
        for i in range(warmup):
            print(f"  [Warmup {i+1}/{warmup}]...", end=" ", flush=True)
            t = run_single_iteration(benchmark_name, config)
            print(f"{t:.2f} ms (discarded)")

        # Measurement phase
        for i in range(iterations):
            print(f"  [Iter {i+1}/{iterations}]...", end=" ", flush=True)
            t = run_single_iteration(benchmark_name, config)
            mem = get_peak_memory_mb()
            times.append(t)
            memory_samples.append(mem)
            print(f"{t:.2f} ms | peak RSS: {mem:.1f} MB")

    # Calculate statistics
    stats = calculate_stats(times)
    peak_memory_mb = max(memory_samples) if memory_samples else 0.0

    print(f"\n--- Statistics ---")
    print(f"  Mean: {stats['mean']:.2f} ms")
    print(f"  Std:  {stats['std']:.2f} ms")
    print(f"  95% CI: [{stats['ci95_lower']:.2f}, {stats['ci95_upper']:.2f}] ms")
    print(f"  Peak Memory: {peak_memory_mb:.1f} MB")

    return {
        "benchmark": benchmark_name,
        "mode": mode,
        "warmup": warmup,
        "iterations": iterations,
        "times_ms": times,
        "statistics": stats,
        "peak_memory_mb": peak_memory_mb,
        "memory_samples_mb": memory_samples,
    }


# =============================================================================
# MAIN
# =============================================================================

def run_suite(
    benchmarks: Optional[List[str]] = None,
    output_file: Optional[str] = None,
    mode: str = "baseline",
    iterations: int = 30,
    warmup: int = 3,
    # M3 T3: pipeline integration options
    ingest: bool = False,
    api_base: str = "http://localhost:8000",
    ui_base: str = "http://localhost:5173",
    output_dir: Optional[str] = None,
    session_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run the complete benchmark suite.

    M2 T3: Added mode, iterations, warmup parameters.
    M3 T3: Added ingest/api_base/ui_base/output_dir/session_name for backend
           pipeline integration. When ingest=True and mode="grof", the run is
           wrapped with session creation, trace upload, and URL output — the
           same workflow as trace.sh but for structured benchmarks.
    """
    import torch

    # Check CUDA availability
    if not torch.cuda.is_available():
        print("ERROR: CUDA is not available!")
        sys.exit(1)

    # Determine which benchmarks to run
    if benchmarks is None:
        benchmarks = list(BENCHMARK_RUNNERS.keys())

    # Validate benchmark names
    for name in benchmarks:
        if name not in BENCHMARK_RUNNERS:
            print(f"ERROR: Unknown benchmark '{name}'")
            print(f"Available: {list(BENCHMARK_RUNNERS.keys())}")
            sys.exit(1)

    # Collect environment info
    print("=" * 60)
    print("GROF Benchmark Suite")
    print(f"Mode: {mode} | Iterations: {iterations} | Warmup: {warmup}")
    if ingest and mode == "grof":
        print(f"Pipeline ingest: ENABLED  (API: {api_base})")
    print("=" * 60)
    print("\nCollecting environment information...")
    environment = get_environment()
    print(f"  GPU: {environment['gpu']['device_name']}")
    print(f"  PyTorch: {environment['pytorch_version']}")
    print(f"  CUDA: {environment['gpu']['cuda_version']}")

    # M3 T3: initialise pipeline when requested
    pipeline: Optional[GrofPipeline] = None
    if ingest and mode == "grof":
        resolved_output_dir = Path(output_dir) if output_dir else Path("/tmp/grof")
        resolved_session_name = (
            session_name
            or f"benchmark_{'_'.join(benchmarks)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        pipeline = GrofPipeline(
            api_base=api_base,
            ui_base=ui_base,
            output_dir=resolved_output_dir,
            session_name=resolved_session_name,
        )
        pipeline.create_session()

    # Run benchmarks with overhead measurement
    all_results = []
    overhead_results = []

    try:
        for name in benchmarks:
            if iterations > 1:
                # M2 T3 mode: Full overhead measurement
                result = run_overhead_measurement(name, mode, iterations, warmup)
                overhead_results.append(result)
            else:
                # Original M1 mode: Single run
                with ProfilerContext(mode, output_dir=resolved_output_dir if pipeline else None):
                    runner = BENCHMARK_RUNNERS[name]
                    config = BENCHMARK_CONFIG[name]
                    results = runner(config)
                    all_results.extend(results)
    finally:
        # M3 T3: always stop session and ingest even if benchmarks raise
        if pipeline is not None:
            pipeline.stop_session()
            pipeline.ingest_traces()

    # Compile final report
    report: Dict[str, Any] = {
        "environment": environment,
        "mode": mode,
        "iterations": iterations,
        "warmup": warmup,
        "benchmarks_run": benchmarks,
        "results": all_results,
        "overhead_measurements": overhead_results,
        "timestamp": datetime.now().isoformat(),
    }
    if pipeline is not None and pipeline.session_id is not None:
        report["session_id"] = pipeline.session_id
        report["session_url"] = pipeline.session_url()

    # Save results
    script_dir = os.path.dirname(os.path.abspath(__file__))
    results_dir = os.path.join(script_dir, RESULTS_DIR)
    os.makedirs(results_dir, exist_ok=True)

    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(results_dir, f"benchmark_{mode}_{timestamp}.json")

    with open(output_file, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print(f"Results saved to: {output_file}")
    print("=" * 60)

    # M3 T3: print URL after saving so it's the last thing the user sees
    if pipeline is not None:
        pipeline.print_url()

    return report


def main():
    parser = argparse.ArgumentParser(
        description="GROF Benchmark Suite Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Profiling Modes (M2 T3):
  baseline   - No profiling (pure baseline)
  grof       - Full GROF (eBPF + CUPTI combined)
  nsys       - NVIDIA Nsight Systems (nsys profile)
  ebpf-only  - Only eBPF CPU profiler (no GPU tracing)  [M2 T3 Week 2]
  cupti-only - Only CUPTI GPU tracing (no CPU profiling) [M2 T3 Week 2]

Per-Component Overhead Analysis (Week 2):
  Run each mode separately, then use attribution.py to compare:
    python run_suite.py --mode=baseline  -b resnet50 -n 30
    python run_suite.py --mode=ebpf-only -b resnet50 -n 30
    python run_suite.py --mode=cupti-only -b resnet50 -n 30
    python run_suite.py --mode=grof      -b resnet50 -n 30
    python analysis/attribution.py --results-dir results/

Pipeline Integration (M3 T3):
  Upload traces to the GROF backend after a grof run:
    python run_suite.py --mode=grof -b resnet50 -n 30 --ingest
    python run_suite.py --mode=grof -b resnet50 -n 30 --ingest --api http://myserver:8000

Validation (M3 T3):
  Smoke-test the full pipeline without running GPU benchmarks:
    python run_suite.py --validate
    python run_suite.py --validate --api http://myserver:8000

Examples:
  python run_suite.py --mode=baseline --iterations=30
  python run_suite.py --mode=grof -b resnet50 -n 30
  python run_suite.py --mode=grof -b resnet50 -n 30 --ingest
  python run_suite.py --mode=nsys --benchmarks micro_gemm bert
  python run_suite.py --validate
        """
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

    # M2 T3 Week 1: Three-Way Runner
    parser.add_argument(
        "--mode", "-m",
        choices=["baseline", "grof", "nsys", "ebpf-only", "cupti-only"],
        default="baseline",
        help="Profiling mode: baseline (no profiling), grof (full GROF), "
             "nsys (Nsight Systems), ebpf-only (CPU profiler only), "
             "cupti-only (GPU tracing only)"
    )

    parser.add_argument(
        "--iterations", "-n",
        type=int,
        default=30,
        help="Number of iterations for statistical significance (default: 30)"
    )

    parser.add_argument(
        "--warmup", "-w",
        type=int,
        default=3,
        help="Number of warmup iterations before measuring (default: 3)"
    )

    # M3 T3: pipeline integration flags
    parser.add_argument(
        "--ingest",
        action="store_true",
        help="Upload traces to the GROF backend after the run (requires --mode=grof)"
    )

    parser.add_argument(
        "--api",
        default="http://localhost:8000",
        metavar="URL",
        help="Backend API base URL (default: http://localhost:8000)"
    )

    parser.add_argument(
        "--ui",
        default="http://localhost:5173",
        metavar="URL",
        help="Frontend UI base URL for the printed session link (default: http://localhost:5173)"
    )

    parser.add_argument(
        "--output-dir",
        default="/tmp/grof",
        metavar="DIR",
        help="Directory where profilers write trace files (default: /tmp/grof)"
    )

    parser.add_argument(
        "--session-name",
        default=None,
        metavar="NAME",
        help="Human-readable session name stored in the backend (default: auto-generated)"
    )

    # M3 T3: end-to-end validation (no GPU required)
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Run end-to-end pipeline smoke test (no GPU needed) then exit"
    )

    args = parser.parse_args()

    # --validate short-circuits everything else
    if args.validate:
        ok = validate_pipeline(api_base=args.api, ui_base=args.ui)
        sys.exit(0 if ok else 1)

    if args.ingest and args.mode != "grof":
        print("ERROR: --ingest requires --mode=grof")
        sys.exit(1)

    run_suite(
        benchmarks=args.benchmarks,
        output_file=args.output,
        mode=args.mode,
        iterations=args.iterations,
        warmup=args.warmup,
        ingest=args.ingest,
        api_base=args.api,
        ui_base=args.ui,
        output_dir=args.output_dir,
        session_name=args.session_name,
    )


if __name__ == "__main__":
    main()