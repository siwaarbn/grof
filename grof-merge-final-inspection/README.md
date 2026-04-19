# GROF — GPU Runtime Observation Framework

> Low-overhead GPU profiler for AI workloads that correlates CPU call stacks with GPU kernel execution in real time.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![CUDA 12.0+](https://img.shields.io/badge/CUDA-12.0+-green.svg)](https://developer.nvidia.com/cuda-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is GROF?

Existing profiling tools like `nsys` and `nvprof` show either CPU or GPU activity — never both together — and introduce 10–50% overhead. GROF solves this:

- **< 5% overhead** — eBPF sampling at 100 Hz, no instrumentation of your code
- **Full-stack correlation** — Python → C++ → CUDA → GPU kernel, linked via CUDA correlation IDs
- **Zero code changes** — profile your existing PyTorch or TensorFlow script as-is
- **Interactive dashboard** — flamegraph, GPU timeline, A/B comparison, performance insights

---

## Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Docker + Docker Compose | Latest |
| NVIDIA GPU | Any CUDA-capable |
| CUDA Toolkit | 12.0+ |
| Linux | Ubuntu 22.04 recommended |
| Python | 3.10+ (for running workloads) |

### 1. Clone the repository

```bash
git clone https://github.com/morecoding2/grof.git
cd grof
git checkout merge-final-inspection
```

### 2. Start all services

```bash
docker-compose up -d --build
```

This starts:
- **Dashboard** at `http://localhost:5173`
- **API** at `http://localhost:8000`
- **API Docs (Swagger)** at `http://localhost:8000/docs`
- **pgAdmin** at `http://localhost:5050`

Wait about 30 seconds for all services to initialize, then open `http://localhost:5173` in your browser.

### 3. Profile a workload

```bash
bash trace.sh LLM10.py
```

The script will:
1. Create a profiling session named after your workload
2. Start the CPU profiler (T1) in the background
3. Run your workload with the GPU profiler (T2) attached
4. Stop both profilers and ingest the trace files
5. Print a clickable URL

```
✅ Tracing complete for: LLM10.py
🔗 View traces at:
   http://localhost:5173/session/7/correlated
```

---

## Architecture

```
Your PyTorch / TensorFlow Workload
         │
         ├── T1: eBPF CPU Profiler (libcudart uprobes, 100 Hz)
         │         └── cpu_correlation_with_stack.json
         │
         ├── T2: CUDA GPU Profiler (CUPTI + NVML)
         │         └── gpu_trace.json
         │
         └── ingest.py ──► FastAPI Backend ──► PostgreSQL + Redis
                                                      │
                                              React Dashboard
```

### Team Structure

| Team | Role | Key Output |
|---|---|---|
| T1 | eBPF CPU profiler | `cpu_correlation_with_stack.json` |
| T2 | CUDA GPU profiler | `gpu_trace.json` |
| T3 | Benchmarks & correlation | ResNet-50, BERT workloads |
| T4 | Backend API + ingestion | FastAPI, PostgreSQL, Redis |
| T5 | Frontend dashboard | React, D3.js, TypeScript |

---

## Dashboard Features

- **Session Registry** — all profiling sessions with GPU%, CPU%, duration
- **CPU Flamegraph** — interactive D3 flamegraph from real eBPF call stacks
- **GPU Timeline** — kernel executions per CUDA stream with real durations
- **CPU-GPU Correlation** — click a flamegraph node to see which GPU kernels it launched and vice versa
- **A/B Comparison** — compare two sessions side by side with a metrics diff table
- **Performance Insights** — automatic bottleneck detection (GPU starvation, low SM utilization)

---

## Manual Usage (without trace.sh)

### Start a session

```bash
curl -X POST "http://localhost:8000/api/v1/sessions/start?name=my_run"
# Returns: {"session_id": 1}
```

### Run your workload with profilers

```bash
# T1 — CPU profiler (requires Linux + sudo)
sudo python3 M2/T1/week3/correlation_stacks.py \
    --output /tmp/grof/cpu_correlation_with_stack.json &

# T2 — GPU profiler (requires CUDA)
GROF_OUTPUT_DIR=/tmp/grof LD_PRELOAD=./libgrof_cuda.so python3 your_workload.py
```

### Stop the session (auto-ingests traces)

```bash
curl -X POST "http://localhost:8000/api/v1/sessions/stop/1"
```

Open: `http://localhost:5173/session/1/correlated`

---

## Configuration

### trace.sh environment variables

| Variable | Default | Description |
|---|---|---|
| `GROF_API` | `http://localhost:8000` | Backend API URL |
| `GROF_UI` | `http://localhost:5173` | Frontend URL printed after tracing |
| `GROF_OUTPUT_DIR` | `/tmp/grof` | Directory for T1/T2 trace files |

### Docker service ports

| Service | URL | Credentials |
|---|---|---|
| Dashboard | http://localhost:5173 | — |
| API | http://localhost:8000 | — |
| Swagger Docs | http://localhost:8000/docs | — |
| pgAdmin | http://localhost:5050 | admin@example.com / admin |

---

## Development

### Run frontend locally

```bash
cd ui
npm install
npm run dev
```

### Run backend locally

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Reset the database

```bash
docker exec -it grof-db psql -U admin -d grof -c \
  "TRUNCATE sessions, cpu_samples, gpu_events, correlation_events, stack_frames RESTART IDENTITY CASCADE;"
docker exec -it grof-redis redis-cli FLUSHALL
```

---

## Troubleshooting

**Dashboard shows no data after trace.sh**
Check the backend logs: `docker logs grof-api --tail 30` and look for `[AUTO-INGEST]` messages.

**API not reachable**
Wait 30 seconds after `docker-compose up` for the database to initialize, then check `docker ps`.

**T1 profiler not found**
T1 requires Linux + a CUDA-capable GPU. trace.sh will skip it gracefully and still ingest GPU data from T2.

**Permission denied**
T1 uses eBPF and requires sudo: `sudo bash trace.sh workload.py`

---

## License

MIT — see [LICENSE](LICENSE) for details.

**Team 90 — TU Darmstadt — Team Project Software Development**
