# GROF Benchmark Suite

Measures the overhead of the GROF profiling stack (T1 eBPF + T2 CUPTI) across
micro and macro GPU workloads, and integrates with the GROF backend pipeline
so results are immediately viewable in the UI.

---

## Quick Start

```bash
cd benchmarks/

# Baseline (no profiler) — all benchmarks, 30 iterations
python run_suite.py --mode=baseline -n 30

# Full GROF profiling — ResNet50 only
python run_suite.py --mode=grof -b resnet50 -n 30

# Full GROF + upload to backend → prints a clickable URL
python run_suite.py --mode=grof -b resnet50 -n 30 --ingest

# Smoke-test the pipeline without running any GPU code
python run_suite.py --validate
```

---

## Profiling Modes

| Mode | eBPF (CPU) | CUPTI (GPU) | Use case |
|------|-----------|-------------|----------|
| `baseline` | — | — | Establish unperturbed baseline |
| `grof` | yes | yes | Full overhead measurement |
| `ebpf-only` | yes | — | Isolate CPU profiler cost |
| `cupti-only` | — | yes | Isolate GPU profiler cost |
| `nsys` | — | — | Compare against Nsight Systems |

---

## Per-Component Overhead Analysis

Run all four modes and feed results to `attribution.py`:

```bash
python run_suite.py --mode=baseline  -b resnet50 -n 30
python run_suite.py --mode=ebpf-only -b resnet50 -n 30
python run_suite.py --mode=cupti-only -b resnet50 -n 30
python run_suite.py --mode=grof      -b resnet50 -n 30

python analysis/attribution.py --results-dir results/
```

---

## Pipeline Integration (`--ingest`)

`--ingest` connects a `--mode=grof` run to the GROF backend:

1. Creates a session via `POST /api/v1/sessions/start`
2. Runs the benchmarks with eBPF + CUPTI enabled
3. Stops the session and calls `backend/ingest.py` to upload trace files
4. Prints a URL to the session detail page in the UI

```bash
# With default backend at localhost:8000 and UI at localhost:5173
python run_suite.py --mode=grof -b resnet50 -n 30 --ingest

# Custom server
python run_suite.py --mode=grof -b resnet50 -n 30 \
  --ingest \
  --api http://gpu-server:8000 \
  --ui http://gpu-server:5173

# Named session
python run_suite.py --mode=grof -b bert resnet50 -n 30 \
  --ingest \
  --session-name "weekly_regression_v2"
```

Trace files are read from `--output-dir` (default: `/tmp/grof`).  The GROF
profilers write there automatically via the `GROF_OUTPUT_DIR` environment
variable set inside `ProfilerContext`.

The result JSON saved to `results/` will include `session_id` and `session_url`
fields when `--ingest` is used.

### Relationship to `trace.sh`

| | `trace.sh` | `run_suite.py --ingest` |
|---|---|---|
| Input | Arbitrary Python script path | Built-in benchmark suite |
| Measurement | Single run, no statistics | N iterations + warmup + 95% CI |
| Use case | Ad-hoc workloads | Structured regression testing |
| Output | URL only | JSON report + URL |

Both use the same backend API and the same `backend/ingest.py` for uploading
traces. Use `trace.sh` for one-off profiling and `run_suite.py --ingest` for
repeatable, statistically-rigorous benchmark runs.

---

## End-to-End Validation (`--validate`)

Verifies the pipeline is reachable before running expensive GPU benchmarks:

```bash
python run_suite.py --validate
python run_suite.py --validate --api http://gpu-server:8000
```

Checks performed (no GPU required):

1. `create_session` — `POST /api/v1/sessions/start` returns a `session_id`
2. `session_in_list` — the new session appears in `GET /api/v1/sessions`
3. `stop_session` — `POST /api/v1/sessions/stop/{id}` succeeds
4. `url_format` — the expected UI URL is well-formed

Exits with code `0` on success, `1` on any failure.

---

## Available Benchmarks

| Name | Description |
|------|-------------|
| `micro_gemm` | Matrix multiplication (512², 1024², 2048²) |
| `micro_memcpy` | Host↔Device and Device↔Device transfers (1M, 10M elements) |
| `micro_launch` | Kernel launch overhead (empty, small, sequential) |
| `resnet50` | ResNet50 inference (batch 1, 8, 32) |
| `bert` | BERT inference (batch 1, 8; seq_len 128) |

Select specific benchmarks with `-b` / `--benchmarks`:

```bash
python run_suite.py -b micro_gemm resnet50 --mode=grof -n 30
```

---

## Output

Results are saved to `benchmarks/results/benchmark_<mode>_<timestamp>.json`.

Top-level fields:

```jsonc
{
  "environment": { "gpu": {...}, "pytorch_version": "...", ... },
  "mode": "grof",
  "iterations": 30,
  "warmup": 3,
  "benchmarks_run": ["resnet50"],
  "overhead_measurements": [
    {
      "benchmark": "resnet50",
      "times_ms": [...],
      "statistics": { "mean": 45.2, "std": 1.1, "ci95_lower": 44.8, "ci95_upper": 45.6 },
      "peak_memory_mb": 1240.5
    }
  ],
  // present only when --ingest was used:
  "session_id": 42,
  "session_url": "http://localhost:5173/session/42/correlated"
}
```
