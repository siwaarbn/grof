# T2 — CUDA GPU Profiler (`grof_cuda.cpp`)

## Overview

`grof_cuda.cpp` is a shared library (`libgrof_cuda.so`) that intercepts CUDA runtime and driver API calls via CUPTI to produce a GPU execution trace. It is loaded at runtime using `LD_PRELOAD` and writes a `gpu_trace.json` file in Chrome Trace Event format.

---

## What Changed (Latest Version)

### ✅ `GROF_OUTPUT_DIR` Environment Variable Support

**Problem:** The output file `gpu_trace.json` was always written to the **current working directory**. This made it hard for the `trace.sh` automation script to reliably find the trace file.

**Change:** `grof_cuda.cpp` now reads the `GROF_OUTPUT_DIR` environment variable to determine where to write `gpu_trace.json`.

| Behavior | Before | After |
|----------|--------|-------|
| Output path | Always `./gpu_trace.json` | `$GROF_OUTPUT_DIR/gpu_trace.json` |
| Default (env not set) | `./gpu_trace.json` | `./gpu_trace.json` (same) |
| Directory creation | No | Auto-creates `$GROF_OUTPUT_DIR` if missing |
| Logging | Fixed path in log | Logs actual output path |

**Backward compatible** — without the env var set, behavior is identical to before.

---

## How to Compile

> Requires CUDA Toolkit (CUPTI headers) and a C++17 compiler. Must be compiled on the **target machine** (e.g., GPU server).

```bash
nvcc -shared -o libgrof_cuda.so grof_cuda.cpp \
  -I$CUDA_HOME/extras/CUPTI/include \
  -L$CUDA_HOME/extras/CUPTI/lib64 \
  -lcupti -lcuda -Xcompiler -fPIC
```

---

## How to Run

### Basic Usage (manual)

Run any CUDA workload with the library preloaded:

```bash
LD_PRELOAD=./libgrof_cuda.so python3 your_workload.py
```

This writes `gpu_trace.json` to the current directory.

### With Custom Output Directory

```bash
GROF_OUTPUT_DIR="/tmp/grof" LD_PRELOAD=./libgrof_cuda.so python3 your_workload.py
```

This writes to `/tmp/grof/gpu_trace.json` (creates the directory if needed).

### Via `trace.sh` (recommended, end-to-end)

The `trace.sh` script automates the full pipeline — profiling, ingestion, and viewing:

```bash
bash trace.sh your_workload.py
```

It automatically sets `GROF_OUTPUT_DIR=/tmp/grof`, runs both the CPU (T1) and GPU (T2) profilers, uploads the traces to the backend, and prints a URL to view the results.

---

## Output Format

The output file `gpu_trace.json` is a JSON array in [Chrome Trace Event](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU) format:

```json
[
  {
    "name": "volta_sgemm_128x64_nn",
    "ph": "X",
    "ts": 123456.789,
    "dur": 45.123,
    "pid": 1,
    "tid": 7,
    "args": {
      "correlationId": 42,
      "externalId": 5,
      "sm_throughput_pct": 78.50,
      "dram_utilization_pct": 32.10
    }
  }
]
```

### Fields

| Field | Description |
|-------|-------------|
| `name` | Demangled kernel or memcpy operation name |
| `ts` | Start timestamp in microseconds |
| `dur` | Duration in microseconds |
| `tid` | CUDA stream ID |
| `correlationId` | CUPTI internal correlation ID |
| `externalId` | GROF external correlation ID (links to CPU events) |
| `sm_throughput_pct` | SM throughput as % of peak (if Range Profiler enabled) |
| `dram_utilization_pct` | DRAM utilization as % of peak (if Range Profiler enabled) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROF_OUTPUT_DIR` | `.` (current dir) | Directory to write `gpu_trace.json` into |

---

## What the Library Captures

1. **Kernel launches** — name, timing, stream, correlation IDs
2. **Memory copies** — HtoD, DtoH, async variants
3. **SM throughput** — via CUPTI Range Profiler (% of peak)
4. **DRAM utilization** — via CUPTI Range Profiler (% of peak)
5. **External correlation IDs** — links GPU events to CPU-side events from T1
