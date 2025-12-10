# Week 2 Report:  Automation & Infrastructure

## Overview

This week I focused on building the **automation infrastructure** for the GROF benchmark suite. I created a unified runner script that executes all benchmarks, collects environment information, and saves results in JSON format.

**Note:** All testing was performed on **Google Colab** (Tesla T4 GPU) since the development machine (MacBook) does not have an NVIDIA GPU.

---

## Project Structure

```
grof/
├── benchmarks/
│   ├── macro_benchmarks/          # End-to-end model benchmarks
│   │   ├── bert.py                # BERT transformer inference benchmark
│   │   └── resnet50.py            # ResNet50 CNN inference benchmark
│   │
│   ├── micro_benchmarks/          # Low-level GPU operation benchmarks
│   │   ├── micro_gemm.py          # Matrix multiplication (compute-bound)
│   │   ├── micro_launch.py        # Kernel launch overhead (latency-bound)
│   │   └── micro_memcpy.py        # Memory transfers (bandwidth-bound)
│   │
│   ├── results/                   # Benchmark output directory (auto-created)
│   │   └── . gitkeep               # Placeholder to keep empty folder in Git
│   │
│   ├── config.py                  # Centralized benchmark parameters
│   ├── environment. py             # System info collector (GPU, CUDA, OS)
│   └── run_suite.py               # Main runner script (CLI interface)
│
└── docs/
    ├── week1_report.md            # Week 1: Initial benchmarks implementation
    └── week2_report.md            # Week 2: Automation & infrastructure
```

---

## File Descriptions

### Micro-Benchmarks (`micro_benchmarks/`)

| File | Purpose | Measures |
|------|---------|----------|
| `micro_gemm.py` | Matrix multiplication (GEMM) | TFLOPS, compute throughput |
| `micro_memcpy.py` | Memory copy operations | Bandwidth (GB/s) for H2D, D2H, D2D |
| `micro_launch.py` | Kernel launch overhead | Latency (µs) per kernel launch |

### Macro-Benchmarks (`macro_benchmarks/`)

| File | Purpose | Measures |
|------|---------|----------|
| `resnet50.py` | CNN image classification | Images/second throughput |
| `bert.py` | Transformer NLP model | Sequences/second throughput |

### Infrastructure (`benchmarks/`)

| File | Purpose |
|------|---------|
| `run_suite.py` | Main CLI runner — executes all benchmarks, saves JSON results |
| `environment.py` | Collects GPU, CUDA, PyTorch, OS information for reproducibility |
| `config.py` | Centralized parameters (matrix sizes, batch sizes, etc.) |
| `results/` | Output directory for JSON benchmark results |

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `week1_report.md` | Week 1 progress:  initial benchmark implementations |
| `week2_report.md` | Week 2 progress: automation, bug fixes, test results |

---

## New Files Created This Week

### 1. `run_suite.py` — Main Runner Script

Command-line tool that orchestrates all benchmarks:

```bash
# Run all benchmarks
! python run_suite.py

# Run specific benchmarks only
!python run_suite.py --benchmarks gemm resnet50

# Save to custom output file
!python run_suite.py --output results/my_run. json
```

**Features:**
- `--benchmarks` flag to select specific tests
- Automatic warmup via `torch.utils.benchmark.Timer`
- Real-time progress output
- JSON export with statistics (median, IQR, num_runs)

### 2. `environment.py` — System Information Collector

Captures environment for reproducibility.

### 3. `config.py` — Centralized Configuration

All benchmark parameters in one place.

---

## Week 1 Bug Fixes

| Bug | Files Affected | Fix |
|-----|----------------|-----|
| Extra spaces in code | `micro_gemm.py`, `micro_memcpy.py` | `torch.  mm` → `torch.mm` |
| `set_seed()` not called | `bert.py`, `resnet50.py` | Added `set_seed(42)` call |
| Missing `torch.no_grad()` | `bert.py`, `resnet50.py` | Wrapped inference in no_grad |
| Missing `synchronize()` | `micro_memcpy.py` | Added `torch.cuda.synchronize()` |

---

## Test Results (Google Colab — Tesla T4)

### Environment
| Component | Version |
|-----------|---------|
| GPU | Tesla T4 (15.83 GB) |
| CUDA | 12.6 |
| PyTorch | 2.9.0+cu126 |
| Driver | 550.54.15 |

### GEMM Performance
| Matrix Size | Time (ms) | TFLOPS |
|-------------|-----------|--------|
| 512×512 | 0.08 | 3.25 |
| 1024×1024 | 0.57 | 3.77 |
| 2048×2048 | 4.10 | 4.19 |

### Memory Bandwidth
| Direction | Size | Bandwidth (GB/s) |
|-----------|------|------------------|
| Host→Device | 40 MB | 3.10 |
| Device→Host | 40 MB | 1.15 |
| Device→Device | 40 MB | 62.61 |

### Model Throughput
| Model | Batch | Throughput |
|-------|-------|------------|
| ResNet50 | 1 | 96.5 img/s |
| ResNet50 | 32 | 393.0 img/s |
| BERT | 1 | 34.8 seq/s |
| BERT | 8 | 161.5 seq/s |

---

## How to Run

### On Google Colab
```python
# 1. Upload files to /content/benchmarks/
# 2. Enable GPU: Runtime → Change runtime type → GPU
# 3. Run:
!python /content/benchmarks/run_suite.py
```

### Locally (requires NVIDIA GPU)
```bash
cd benchmarks
python run_suite.py
```

