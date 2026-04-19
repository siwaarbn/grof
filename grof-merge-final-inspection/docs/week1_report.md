# Week 1 Report: GPU Benchmark Implementation

## Overview
This week I implemented a set of micro and macro benchmarks for GPU performance analysis using PyTorch's benchmarking utilities, following the [PyTorch Benchmark Tutorial](https://pytorch.org/tutorials/recipes/recipes/benchmark.html).

## What are Benchmarks and Why Do We Need Them? 

### Definition

A **benchmark** is a standardized test that measures the performance of hardware or software under specific conditions. In the context of GPU computing, benchmarks help us understand how efficiently our code utilizes GPU resources. 

### Why Benchmarks Matter

| Problem | How Benchmarks Help |
|---------|---------------------|
| "Is my code fast enough?" | Provides concrete metrics (TFLOPS, GB/s, latency) |
| "Where is the bottleneck?" | Identifies if code is compute-bound, memory-bound, or latency-bound |
| "Did my optimization work?" | Before/after comparison with measurable results |
| "Which GPU should I use?" | Compare performance across different hardware |

### Types of Benchmarks

| Type | What it measures | Example |
|------|------------------|---------|
| **Micro-benchmark** | Single low-level operation | Matrix multiplication, memory copy |
| **Macro-benchmark** | End-to-end model performance | ResNet inference, BERT training |

### Environment Setup

- **Local Development**: PyCharm on macOS (no GPU)
- **Testing**: Google Colab with Tesla T4 GPU
- **Reason**: Mac doesn't have NVIDIA GPU, so I write code locally and test in Colab

### Three Types of GPU Bottlenecks

Understanding bottlenecks is essential for optimization:

| Bottleneck Type | Limited By | Example | Metric |
|-----------------|------------|---------|--------|
| **Compute-bound** | GPU cores (ALUs) | Matrix multiplication | TFLOPS |
| **Bandwidth-bound** | Memory transfer speed | Large tensor copies | GB/s |
| **Latency-bound** | Kernel launch overhead | Many small operations | µs per launch |

### Implemented Benchmarks

#### Micro Benchmarks (Low-level operations)

| File | Type | What it measures |
|------|------|------------------|
| `micro_gemm.py` | Compute-bound | Matrix multiplication speed (TFLOPS) |
| `micro_memcpy.py` | Bandwidth-bound | Host↔Device transfer speed (GB/s) |
| `micro_launch.py` | Latency-bound | Kernel launch overhead (µs) |

#### Macro Benchmarks (End-to-end models)

| File | Model | What it measures |
|------|-------|------------------|
| `macro_resnet.py` | ResNet50 | Image inference throughput (images/sec) |
| `macro_bert.py` | BERT | Text inference throughput (sequences/sec) |

## Key Learnings

### 1. PyTorch Benchmark Timer

GPU operations are **asynchronous** — the CPU doesn't wait for GPU to finish. Simple timing methods give incorrect results.
Use `torch.utils.benchmark.Timer` with `blocked_autorange()` method for accurate measurements:

```python
from torch.utils.benchmark import Timer

timer = Timer(
    stmt='torch.mm(A, B)',
    globals={'torch': torch, 'A': A, 'B': B}
)
measurement = timer.blocked_autorange(min_run_time=1.0)
```

**Why `blocked_autorange()`?**
- Automatically determines optimal number of runs
- Provides warmup
- Handles CUDA synchronization
- Returns median, IQR, and other statistics

## Testing in Google Colab

The benchmark code in PyCharm and Colab is identical. Below are the test sections added for Colab execution and the results obtained on Tesla T4 GPU. 

---

### Test 1: GEMM Benchmark (micro_gemm. py)

**Test code:**

```python
# === Test ===
print("=" * 60)
print("Benchmark: GEMM (Matrix Multiplication)")
print(f"GPU: {torch.cuda. get_device_name(0)}")
print("=" * 60)

for size in [512, 1024, 2048, 4096]:
    m, tflops = benchmark_gemm(size)
    print(f"\nSize: {size}x{size}")
    print(m)
    print(f"  TFLOPS: {tflops:.2f}")
```

**Results:**

| Size | Time | TFLOPS |
|------|------|--------|
| 512×512 | 83.37 µs | 3.22 |
| 1024×1024 | 571.92 µs | 3.75 |
| 2048×2048 | 4.07 ms | 4.22 |
| 4096×4096 | 32.45 ms | 4.24 |

**Conclusion:** Larger matrices achieve higher TFLOPS because GPU cores are better utilized. Small matrices (512×512) show lower efficiency due to insufficient parallelism to fully occupy the GPU. Tesla T4 reaches ~4.2 TFLOPS for large matrices, which is reasonable for FP32 operations.

---

### Test 2: Memory Copy Benchmark (micro_memcpy.py)

**Test code:**

```python
# === Test ===
print("=" * 60)
print("Benchmark: Memory Copy")
print(f"GPU: {torch. cuda.get_device_name(0)}")
print("=" * 60)

for num_elements in [1_000_000, 10_000_000, 100_000_000]:
    size_mb = (num_elements * 4) / 1e6
    print(f"\nSize: {num_elements:,} elements ({size_mb:.1f} MB)")
    
    m, bw = benchmark_host_to_device(num_elements)
    print(f"  Host→Device:   {bw:.2f} GB/s")
    
    m, bw = benchmark_device_to_host(num_elements)
    print(f"  Device→Host:   {bw:.2f} GB/s")
    
    m, bw = benchmark_device_to_device(num_elements)
    print(f"  Device→Device: {bw:.2f} GB/s")
```

**Results:**

| Size | Host→Device | Device→Host | Device→Device |
|------|-------------|-------------|---------------|
| 4.0 MB | 4.17 GB/s | 4.44 GB/s | 106.20 GB/s |
| 40.0 MB | 4.98 GB/s | 1.52 GB/s | 120.47 GB/s |
| 400. 0 MB | 4.73 GB/s | 1.52 GB/s | 121.79 GB/s |

**Conclusion:** GPU internal memory (Device→Device) is 25-30x faster than PCIe transfers. Host↔Device bandwidth is limited by PCIe bus (~5 GB/s). This shows why minimizing CPU-GPU data transfers is critical for performance.

---

### Test 3: Kernel Launch Overhead (micro_launch. py)

**Test code:**

```python
# === Test ===
print("=" * 60)
print("Benchmark: Kernel Launch Overhead")
print(f"GPU: {torch.cuda.get_device_name(0)}")
print("=" * 60)

m, overhead = benchmark_empty_kernel()
print(f"\nEmpty (synchronize):")
print(m)
print(f"  Overhead: {overhead:.2f} µs")

for size in [1, 10, 100]:
    m, overhead = benchmark_small_kernel(size)
    print(f"\nSmall kernel (size={size}):")
    print(m)
    print(f"  Overhead: {overhead:. 2f} µs")

for n in [10, 100]:
    m, overhead_per = benchmark_many_small_kernels(n)
    print(f"\n{n} sequential kernels:")
    print(m)
    print(f"  Overhead per kernel: {overhead_per:.2f} µs")
```

**Results:**

| Operation | Overhead |
|-----------|----------|
| Empty sync | 9.88 µs |
| Small kernel (size=1) | 9.83 µs |
| Small kernel (size=10) | 9. 96 µs |
| Small kernel (size=100) | 9.80 µs |
| 10 sequential kernels | 9.81 µs per kernel |
| 100 sequential kernels | 9.73 µs per kernel |

**Conclusion:** Each kernel launch has a fixed overhead of ~10 µs regardless of data size. This means launching 1000 small operations costs 10 ms just in overhead!  This is why batching operations and avoiding many small kernels is important for GPU efficiency.

---

### Test 4: ResNet50 Inference (macro_resnet.py)

**Test code:**

```python
# === Test ===
print("=" * 60)
print("Benchmark: ResNet50 Inference")
print(f"GPU: {torch.cuda. get_device_name(0)}")
print("=" * 60)

for batch_size in [1, 8, 32]:
    m, ips = benchmark_resnet(batch_size)
    print(f"\nBatch size: {batch_size}")
    print(m)
    print(f"  Images/sec: {ips:.1f}")
```

**Results:**

| Batch Size | Time | Throughput |
|------------|------|------------|
| 1 | 5.29 ms | 189.1 img/sec |
| 8 | 25.64 ms | 312.0 img/sec |
| 32 | 86.64 ms | 369.4 img/sec |

**Conclusion:** Larger batch sizes lead to higher throughput because GPU parallelism is better utilized.  Batch=32 achieves ~2x throughput compared to batch=1.  However, latency increases with batch size, so there's a trade-off between throughput and latency depending on the application. 

---

### Test 5: BERT Inference (macro_bert.py)

**Test code:**

```python
! pip install transformers -q

# === Test ===
print("=" * 60)
print("Benchmark: BERT Inference")
print(f"GPU: {torch.cuda.get_device_name(0)}")
print("=" * 60)

for batch_size in [1, 8, 32]:
    m, sps = benchmark_bert(batch_size, seq_length=128)
    print(f"\nBatch size: {batch_size}, Seq length: 128")
    print(m)
    print(f"  Sequences/sec: {sps:.1f}")
```

**Results:**

| Batch Size | Time | Throughput |
|------------|------|------------|
| 1 | 8.95 ms | 111.8 seq/sec |
| 8 | 52.36 ms | 152.8 seq/sec |
| 32 | 191.51 ms | 167. 1 seq/sec |

**Conclusion:** BERT shows similar scaling behavior to ResNet — larger batches improve throughput.  However, BERT is more memory-intensive due to attention mechanisms, so throughput gains are smaller compared to ResNet.  BERT batch=32 is only 1.5x faster than batch=1, while ResNet achieves 2x improvement.

---

## Challenges Faced

### 1. No Local GPU

**Problem**: My Mac doesn't have NVIDIA GPU.  

**Solution**: Write code in PyCharm, test in Google Colab. 

### 2.  PyCharm Import Errors

**Problem**: PyCharm showed "Unresolved reference" for `torchvision` and `transformers`.

**Solution**: Install packages locally for code completion:

```bash
pip install torchvision transformers
```

## Project Structure

```
grof/
├── benchmarks/
│   ├── micro_benchmarks/
│   │   ├── micro_gemm. py      # Matrix multiplication
│   │   ├── micro_memcpy.py    # Memory transfers
│   │   └── micro_launch. py    # Kernel launch overhead
│   └── macro_benchmarks/
│       ├── macro_resnet.py    # ResNet50 inference
│       └── macro_bert. py      # BERT inference
└── docs/
    └── week1_report. md        # This report
```


