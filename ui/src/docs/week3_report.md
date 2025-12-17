# Week 3: Timeline View (Gantt Chart) Implementation

## Overview

This week I implemented the **GPU Timeline (Gantt Chart)** component for the GROF profiler frontend. This visualization is **critical for GPU profiling** as it allows developers to see kernel execution across multiple streams, identify bottlenecks, and understand parallel execution patterns.

---

## Week 3 Requirements (Completed)

As specified in the assignment:

### **Timeline View (Gantt Chart)**

> **Concept**: A horizontal timeline showing GPU kernels.   
> **Row 1**: Stream 1  
> **Row 2**: Stream 2  
> **Implementation**: Use a library like vis-timeline or build a simple SVG-based timeline with D3.  
> **Data Mapping**: Map the GPU events (Start, End, Name) to rectangles on the timeline.

---

## Implementation Details

### 1. **Horizontal Timeline**
- Built using **D3.js** with SVG rendering
- Time displayed on horizontal X-axis
- Each GPU kernel shown as a colored rectangle

### 2. **Stream Rows**
- **Stream 0** (Row 1): Top row showing forward pass operations
- **Stream 1** (Row 2): Bottom row showing backward pass operations
- Clear visual separation with horizontal grid lines
- Stream labels on left Y-axis

### 3. **D3 SVG Implementation**
**Why D3 instead of vis-timeline?**

| Feature | D3 (Chosen) | vis-timeline |
|---------|-------------|--------------|
| Bundle size | Already included (~200KB) | Extra 500KB |
| Customization | Full control | Limited |
| Consistency | Matches Flamegraph style | Different look |
| Learning curve | Reuse existing knowledge | New API |


## 4. Color Coding

Rectangles colored by operation type:
- 🟣 CUDA (purple): Compute operations (conv2d, matmul, attention)
- 🔴 Memory (red): Data transfers (cudaMemcpy)
- 🔵 Kernel (blue): Specialized kernels (relu, softmax)

## 5. Interactive Features

Hover tooltips showing:
- Kernel name
- Event type
- Stream number
- Duration in milliseconds
- Start time

Visual feedback: White border appears on hover

Text labels: Kernel names displayed inside wide rectangles

## Mock Data

9 GPU Events across 2 Streams:

| Stream | Event Count | Example Operations |
|--------|-------------|-------------------|
| Stream 0 | 5 events | conv2d_forward, cudaMemcpy_HtoD, relu_kernel, batch_norm_forward, max_pool2d |
| Stream 1 | 4 events | conv2d_backward, cudaMemcpy_DtoH, relu_backward, optimizer_step |

Total Timeline Duration: 85 milliseconds

Key Feature: Overlapping rectangles show parallel execution between streams.


## Project Structure

```
src/
├── components/
│   └── Timeline.tsx              # Timeline component (~250 lines)
├── data/
│   └── mockGpuEvents.ts          # Mock GPU events data
└── pages/
    └── Dashboard.tsx             # Integrated Timeline
```

---