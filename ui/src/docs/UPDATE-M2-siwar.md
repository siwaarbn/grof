GROF – Milestone 2
Backend–Frontend Integration & Debugging Report

This document summarizes the debugging, integration, and stabilization work performed to make Milestone 2 (Weeks 3 & 4) functional using real backend data instead of mock data.

1. Initial Context

Milestone 2 focuses on:

Week 3: Comparison Mode (A/B performance comparison)

Week 4: Performance Insights Dashboard (automatic analysis & recommendations)

Originally, the frontend was developed using mock data (Olga’s layer).
Once the backend became available, the goal was to replace mock data with real API calls and verify that the UI works end-to-end.

2. Backend Reality Check (Swagger Validation)

Using Swagger (/docs), the following backend facts were confirmed:

✅ Available & working

GET /api/v1/sessions/{id}/flamegraph

GET /api/v1/sessions/{id}/critical-path

GET /api/v1/sessions

❌ Not usable via GET

GET /api/v1/sessions/{id}/cpu-samples → 405 Method Not Allowed

No public GET gpu-events endpoint usable by the frontend

Conclusion:
Fine-grained CPU samples and GPU events are not currently fetchable for Milestone 2.

3. Core Problem Encountered

The frontend utility:

aggregateSessionMetrics(rawSession)


was originally written assuming a complete RawSession object, including:

cpu_samples

gpu_events

flamegraph

criticalPath

When real backend data was used:

cpu_samples was missing → runtime crash

gpu_events was missing → runtime crash

Partial objects caused TypeScript excess-property errors

4. TypeScript & Runtime Issues Fixed
4.1 Routing & Page Load Issues

Missing /compare route → blank page

Fixed routing and confirmed /compare?ids=1,2 works

4.2 TypeScript Strictness

Problems encountered:

RawSession not matching partial objects

Excess property checks on object literals

unknown not assignable to RawSession

Solution used:

Construct a minimal object

Use controlled casting:

metricsInput as unknown as RawSession


This avoids refactoring shared types during the milestone.

5. Final Stabilization Strategy (Key Decision)

Since the backend does not expose CPU samples or GPU events yet:

Decision

Do NOT call unavailable endpoints

Do NOT modify backend

Do NOT reintroduce mock layers globally

Instead:

const metricsInput = {
  flamegraph,
  criticalPath,
  cpu_samples: [],
  gpu_events: [],
};

Why this is correct

aggregateSessionMetrics only iterates over these arrays

Empty arrays are valid iterables

Prevents runtime crashes

Keeps logic honest: no fake performance data

6. Final Working Frontend State
Week 3 – Comparison Mode

Side-by-side session comparison

Δ (delta) calculation

PDF export works

Handles real backend sessions

Week 4 – Performance Insights

Recommendations panel renders

“No major performance issues detected” shown when data is empty

Kernel tables render (empty state handled gracefully)

Important Note

All metric values are 0 ms because:

No GPU events / CPU samples are available yet

This is expected behavior, not a bug

7. What Was Explicitly NOT Done (By Design)

❌ No fake GPU timings

❌ No backend changes

❌ No refactor of aggregateSessionMetrics

❌ No reintroduction of mock data

❌ No weakening of TypeScript config

This keeps Milestone 2 stable, honest, and reproducible.