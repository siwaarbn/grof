# GROF: GPU Radiance and Occupancy Field Profiler
### Advanced Low-Overhead GPU Profiler for AI Workloads

**Bachelor Group Project • 5 Students**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![CUDA 12.0+](https://img.shields.io/badge/CUDA-12.0+-green.svg)](https://developer.nvidia.com/cuda-toolkit)

---

## 🎯 Project Overview

**GROF** is a production-grade GPU profiler designed to provide deep insights into AI/ML workloads with minimal performance overhead. This project combines cutting-edge systems programming (eBPF, CUDA) with modern web technologies to create a comprehensive profiling solution for PyTorch and TensorFlow applications.

### Why This Project?

Training deep learning models is expensive and time-consuming. Developers need to understand where their GPU time is spent, but existing tools like `nsys` and `nvprof` introduce **10-50% overhead**, making them unsuitable for production profiling. GROF aims to achieve **<5% overhead** while providing rich, interactive visualizations of CPU and GPU execution.

### What Makes GROF Special?

- 🔍 **Full-Stack Visibility:** Python → C++ → CUDA → GPU Assembly (SASS)
- ⚡ **Low Overhead:** <5% performance impact using eBPF and smart sampling
- 🔗 **CPU-GPU Correlation:** Link Python code directly to GPU kernel execution
- 📊 **Rich Visualizations:** Interactive flamegraphs, timelines, and metrics dashboards
- 🤖 **AI Framework Integration:** Seamless PyTorch profiling with minimal code changes

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────┐
│     AI Application (PyTorch/TensorFlow Model)      │
│              (User's Python Code)                   │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│        eBPF Profiler (CPU Stack Sampling)          │
│     Captures Python + C++ call stacks @ 100 Hz     │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│    CUDA Injection Library (CUPTI + NVML)           │
│   Intercepts CUDA calls, profiles GPU kernels      │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│          Correlation & Merging Engine              │
│    Links CPU stack traces to GPU kernel events     │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│     Backend Storage & Processing (PostgreSQL)      │
│         Stores and aggregates trace data           │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│   Web UI: Flamegraphs, Timelines, Metrics          │
│       Interactive visualization dashboard           │
└────────────────────────────────────────────────────┘
```

---

## 👥 Team Structure

This project is divided into **5 specialized teams** with clear interfaces. Note that students have overlapping responsibilities to ensure knowledge transfer.

| Team | Students | Role | Technologies | Complexity |
|------|----------|------|--------------|------------|
| **T1** | **Fouad, Maria** | eBPF & Python Stack Unwinding | C, eBPF, CPython internals | ⚠️ HIGH |
| **T2** | **Maria, Fouad** | CUDA Profiling & Instrumentation | C/C++, CUDA, CUPTI, NVML | ⚠️ HIGH |
| **T3** | **Olga, Khalil** | Testing, Benchmarks & Integration | Python, PyTorch, ML | 🟨 MEDIUM-HIGH |
| **T4** | **Khalil, Siwar** | Backend & Data Pipeline | Python, PostgreSQL, APIs | 🟨 MEDIUM-HIGH |
| **T5** | **Siwar, Olga** | Visualization & UI | JavaScript, React, D3.js | 🟨 MEDIUM-HIGH |

**Collaboration is essential!** Weekly integration meetings ensure all components work together seamlessly.

---

## 🚀 Getting Started

### Prerequisites

**Hardware:**
- Linux workstation (Ubuntu 22.04 recommended)
- NVIDIA GPU
- 16GB+ RAM

**Software:**
- CUDA Toolkit 12.0+
- Python 3.10+
- GCC 11+ or Clang 14+
- BCC tools (for eBPF)
- PostgreSQL 14+
- Node.js 18+ & npm

### Installation

```bash
# Clone the repository
git clone https://github.com/morecoding2/grof.git
cd grof

# Set up environment (Ubuntu/Debian)
./scripts/setup.sh

# Verify CUDA installation
nvidia-smi
nvcc --version

# Install Python dependencies
pip install -r requirements.txt

# Set up the database
./scripts/init_db.sh

# Build eBPF profiler
cd ebpf-profiler
make

# Build CUDA injection library
cd ../cuda-profiler
make

# Start the backend
cd ../backend
python app.py

# Start the frontend (in another terminal)
cd ../frontend
npm install
npm start
```

### Quick Test

```bash
# Profile a simple PyTorch model
python examples/profile_resnet.py

# View results at http://localhost:3000
```

---

## 📚 Project Structure

```
grof/
├── ebpf-profiler/          # eBPF-based CPU profiler (T1)
│   ├── src/
│   ├── include/
│   └── Makefile
├── cuda-profiler/          # CUDA injection library (T2)
│   ├── src/
│   ├── include/
│   └── Makefile
├── correlation/            # CPU-GPU correlation engine (T3)
│   └── correlator.py
├── benchmarks/             # Test suite and benchmarks (T3)
│   ├── pytorch_models/
│   └── run_benchmarks.py
├── backend/                # Backend API and storage (T4)
│   ├── app.py
│   ├── models/
│   └── api/
├── frontend/               # Web UI and visualizations (T5)
│   ├── src/
│   ├── components/
│   └── public/
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── USER_GUIDE.md
└── scripts/                # Setup and utility scripts
```

---

## 🎯 Project Milestones

### Month 1: Foundation (Weeks 1-4)
- ✅ Environment setup and technology learning
- ✅ Architecture design and documentation
- ✅ Initial prototypes for each component
- **Deliverable:** Working prototypes + architecture doc

### Month 2: Core Development (Weeks 5-8)
- ✅ Implement core profiling components
- ✅ First integration and basic correlation
- ✅ Basic end-to-end demo
- **Deliverable:** Core profiling working

### Month 3: Advanced Features (Weeks 9-12)
- ✅ Complete feature set
- ✅ SASS disassembly integration
- ✅ Advanced visualizations
- ✅ Optimize for <5% overhead
- **Deliverable:** Feature-complete system

### Month 4: Polish & Delivery (Weeks 13-16)
- ✅ Comprehensive testing and validation
- ✅ Documentation sprint
- ✅ Final presentation preparation
- **Deliverable:** Production-ready, documented system

---

## 🎓 Learning Outcomes

By the end of this project, you will have mastered:

### Systems Programming
- eBPF programming and Linux kernel tracing
- Low-level memory access and debugging
- Performance optimization techniques
- Multi-threaded programming

### GPU Architecture
- CUDA programming model and architecture
- GPU performance counters and metrics
- SASS assembly language
- CUPTI and NVML APIs

### Language Internals
- CPython interpreter structure
- Stack unwinding algorithms
- Frame pointer and DWARF debugging

### Full-Stack Development
- Backend API design (REST/GraphQL)
- Database schema design
- React and modern JavaScript
- Data visualization with D3.js

### Software Engineering
- Large-scale codebase collaboration
- Git workflow and code reviews
- Testing and validation strategies
- Documentation and technical writing

---

## 📅 Milestone 1: Foundation & Prototyping (Weeks 1-4)

**Goal:** Establish the development environment, understand core technologies, and build independent "Hello World" prototypes for each component.

### 🟢 T1: eBPF & Stack Unwinding (Fouad, Maria)
**Objective:** Build a standalone eBPF script that can read Python stack frames.
- [ ] **Research:** Deep dive into CPython interpreter internals (specifically `PyEval_EvalFrameDefault`) and BCC/libbpf.
- [ ] **Environment:** Set up a Linux environment with BCC tools installed.
- [ ] **Development:** Write a basic eBPF program (C + Python wrapper) that attaches to a running Python process.
- [ ] **Deliverable:** A script `simple_profiler.py` that prints the name of the currently executing Python function 100 times per second.

### 🔵 T2: CUDA Instrumentation (Maria, Fouad)
**Objective:** Intercept CUDA calls to detect when kernels are launched.
- [ ] **Research:** Study the CUPTI Activity API and Callback API documentation.
- [ ] **Environment:** Verify CUDA Toolkit 12.0+ installation and build sample CUPTI samples.
- [ ] **Development:** Create a dynamic library (`.so`) using CUPTI that subscribes to kernel launch callbacks.
- [ ] **Deliverable:** A shared library that, when loaded with `LD_PRELOAD` running a PyTorch script, prints the name of every GPU kernel launched to stdout.

### 🟠 T3: Testing & Benchmarks (Olga, Khalil)
**Objective:** Establish baseline performance metrics for comparison.
- [ ] **Research:** Analyze the overhead and output format of `nsys` (Nsight Systems) and `torch.profiler`.
- [ ] **Development:** Set up the `benchmarks/` directory with 3 standard models: ResNet50 (Computer Vision), BERT (NLP), and a simple custom CNN.
- [ ] **Deliverable:** A "Baseline Performance Report" (PDF/MD) documenting the execution time and GPU utilization of these models *without* GROF, to serve as the ground truth.

### 🟣 T4: Backend & Data (Khalil, Siwar)
**Objective:** Design the data structure for storing profiling traces.
- [ ] **Research:** Define a JSON schema that can represent both a CPU stack trace (from T1) and a GPU kernel event (from T2).
- [ ] **Development:** Set up a PostgreSQL database and a basic FastAPI/Flask application skeleton.
- [ ] **Deliverable:** A running API with an `/ingest` endpoint that accepts dummy JSON trace data and stores it in the database.

### 🟡 T5: Visualization (Siwar, Olga)
**Objective:** Create the visual shell for the profiler.
- [ ] **Research:** Investigate D3.js flamegraph libraries and React integration patterns.
- [ ] **Development:** Initialize the React frontend project and create the basic layout (sidebar, header, main view).
- [ ] **Deliverable:** A web page displaying a **static** flamegraph rendered from a hardcoded JSON file (matching the schema defined by T4).

---

## 📚 Resources

### eBPF & Kernel Programming
- [BCC Tutorial](https://github.com/iovisor/bcc/blob/master/docs/tutorial.md)
- [Linux Kernel Tracing](https://www.kernel.org/doc/html/latest/trace/index.html)
- [eBPF.io](https://ebpf.io/)

### CUDA & GPU Programming
- [CUDA Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/)
- [CUPTI Documentation](https://docs.nvidia.com/cuda/cupti/)
- [GPU Performance Analysis](https://docs.nvidia.com/nsight-systems/)

### PyTorch & ML
- [PyTorch Profiler](https://pytorch.org/tutorials/recipes/recipes/profiler_recipe.html)
- [PyTorch Internals](http://blog.ezyang.com/2019/05/pytorch-internals/)

### Visualization
- [D3.js Documentation](https://d3js.org/)
- [Flamegraph Visualization](http://www.brendangregg.com/flamegraphs.html)
- [Chrome Tracing Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/)

---

## 📬 Contact

**Project Supervisor:** Mohamadreza Rostami M.Sc.
**Email:** mohamadreza.rostami@tu-darmstadt.de
**Office:** FB Informatik / FG Systemsicherheit Pankratiusstraße 2 (S2 20, Raum 311) 64289 Darmstadt

