# 🧠 GROF Frontend — Milestone 2 (T5)
## Interactive Correlation, Comparison & Performance Insights

**Author:** Siwar  
**Scope:** Frontend (React + TypeScript)  
**Milestones Covered:** Week 1 → Week 4  
**Status:** ✅ Frontend complete, ⚠️ Backend integration blocked by CORS  

---

## 🧭 Overview

This frontend implements the **visual analysis and insight layer** of **GROF**.  
Its purpose is to transform low-level profiling traces into **clear, actionable performance insights** for users.

The frontend supports:
- CPU–GPU correlation views
- Multi-run performance comparison (A/B testing)
- Kernel-level performance analysis
- Automated bottleneck detection
- Optimization recommendations
- Exportable PDF performance reports

The work evolved from a **mock-based prototype** into a **backend-ready, production-grade frontend architecture**, explicitly designed to integrate CUPTI (T2) and eBPF (T1) data.

---

## 🛠️ Phase 1 — Fixing Existing Frontend (Olga’s Work)

### 🔴 Initial Situation

The initial frontend (Weeks 1–2) relied heavily on:
- `mockSessions`
- `mockFlamegraphData`
- `mockGpuEvents`
- Hardcoded fallback logic inside API layers

This created several problems:
- ❌ Type inconsistencies across components
- ❌ Confusion between UI IDs (`session-001`) and backend IDs (`1`)
- ❌ Components appeared “integrated” but were disconnected from real data
- ❌ Impossible to scale beyond demos

---

### ✅ Actions Taken

#### 1. Mock Isolation
- Identified **all mock entry points**
- Restricted mock data to **development-only usage**
- Reconnected components to real API calls:
  - `fetchSessions`
  - `fetchSessionById`

#### 2. Aggregation Layer (Critical Design Fix)

A **dedicated aggregation layer** was introduced:

```ts
aggregateSessionMetrics(rawSession) → SessionMetrics
This layer:

Converts raw backend data

Produces stable, frontend-friendly metrics

Decouples UI logic from backend schemas

✅ Stable Metrics Definition
SessionMetrics {
  totalTimeMs
  cpuTotalTimeMs
  cpuFunctions[]
  gpuTotalTimeMs
  gpuIdleTimeMs
  gpuKernels[]
  memcpyTimeMs
}
📌 Result:
The frontend now depends only on metrics, not raw backend structures.
This decision enabled comparison, insights, and export features later on.

🔗 Phase 2 — CPU–GPU Correlation View (Week 2)
🎯 Goal
Allow users to correlate CPU flamegraph nodes with GPU timeline events, enabling reasoning about CPU-driven GPU behavior.

✅ Implemented
Correlation Types
FlamegraphNode {
  relatedGpuEvents?: string[]
}

CorrelatedGpuEvent {
  relatedFlamegraphNodes?: string[]
}
Correlation State
CorrelationSelection {
  type: 'flamegraph' | 'timeline'
  nodeId
  relatedIds
}
Interaction Behavior
Clicking a CPU function highlights related GPU kernels

Clicking a GPU kernel highlights CPU callers

📌 Architecture is fully prepared for CUPTI external correlation IDs from T2.

📊 Phase 3 — Comparison Mode (Week 3)
🎯 Goal
Enable A/B performance testing between multiple profiling sessions.

✅ Implemented Features
🔹 Multi-Session Selection
Users select 2+ sessions from the dashboard

Sessions passed via query parameters:

/compare?ids=session-002,session-003
🔹 Session ID Normalization
Frontend converts UI IDs:

session-002 → 2
to match backend numeric IDs.

This resolved mismatches between UI-friendly identifiers and backend database IDs.

🔹 Side-by-Side Metrics Table
Displayed per session:

Total GPU time

Memcpy time

Kernel count

Includes:

Delta column

Color coding:

🟢 Faster

🔴 Slower

❌ Critical Blocker Encountered
 Backend CORS Failure
When switching from mock data to real backend data, the browser blocked requests:

Access to XMLHttpRequest has been blocked by CORS policy
No 'Access-Control-Allow-Origin' header
Affected Endpoints
/sessions/{id}

/gpu-events/{session_id}

Key Facts
✅ Frontend logic correct

✅ API calls executed

❌ Browser blocked requests

❌ Comparison page fails with real data

📌 Conclusion:
This is entirely a backend CORS configuration issue, not a frontend bug.

🧠 Phase 4 — Performance Insights Dashboard (Week 4)
Week 4 was designed to be metrics-driven, not backend-dependent.

🔍 Bottleneck Detection (Automatic)
Implemented Rules
Condition	Insight
GPU idle / total > 30%	⚠️ CPU Bottleneck Detected
Memcpy / total > 20%	⚠️ Optimize data transfers
Computation
gpuIdleRatio = gpuIdleTime / totalTime
memcpyRatio = memcpyTime / totalTime
🧬 Kernel Analysis
For each GPU kernel, the frontend displays:

Total execution time

Number of calls

Prepared for advanced metrics from T2:

SM utilization

DRAM utilization

Rendered via:

<KernelAnalysisTable metrics={SessionMetrics} />
💡 Recommendations Panel
Features
Collapsible side panel

Ranked optimization opportunities

Severity-based ordering

Human-readable explanations

Examples
“CPU bottleneck detected — GPU idle 42%”

“Kernel sgemm has low SM utilization — increase batch size”

Architecture
generateRecommendations(metrics) → Recommendation[]
📄 Export Performance Report (PDF)
✅ Fully Implemented
One-click PDF export

WYSIWYG (exports rendered UI)

Includes:

Metrics tables

Kernel analysis

Recommendations

Libraries Used
html2canvas

jsPDF

📌 No backend dependency.

🧪 Testing Summary
✅ Testable
Kernel analysis

Bottleneck detection

Recommendation ranking

PDF export

UI composition

❌ Blocked
Live comparison with real backend data

Reason: Backend CORS misconfiguration.

🧱 Frontend Architecture (Final)
Raw Backend Data
        ↓
aggregateSessionMetrics
        ↓
SessionMetrics
        ↓
Comparison / Insights / PDF Export
🏁 Final Status
Feature	Status
CPU–GPU correlation	✅
Multi-session comparison	⚠️ Backend blocked
Kernel analysis	✅
Bottleneck detection	✅
Recommendations panel	✅
PDF export	✅
Frontend architecture	✅
📌 Final Note to Supervisor
All frontend responsibilities for Milestone 2 (T5) are fully implemented.

Remaining issues are backend-side (CORS configuration) and cannot be resolved from the frontend.

The frontend is ready, scalable, and production-grade once backend access is restored