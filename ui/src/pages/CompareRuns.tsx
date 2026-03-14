import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CorrelationProvider } from "../context/CorrelationContext";

/* ===== API ===== */
import { fetchSessionMetrics } from "../api/sessions";

/* ===== UTILS ===== */
import { exportElementToPdf } from "../utils/exportPdf";

/* ===== TYPES ===== */
import type { SessionMetrics } from "../types/comparison";

/* ===== COMPONENTS ===== */
import KernelAnalysisTable from "../components/KernelAnalysisTable";
import RecommendationsPanel from "../components/RecommendationsPanel";
import CorrelatedFlamegraph from "../components/CorrelatedFlamegraph";
import CorrelatedTimeline from "../components/CorrelatedTimeline";

/* ================= TYPES ================= */

type SessionComparison = {
  sessionId: number;
  metrics: SessionMetrics;
};

/* ================= HELPERS ================= */

function parseSessionIds(param: string | null): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map(Number)
    .filter((x) => Number.isFinite(x));
}

function buildFlamegraphData(
  cpuFunctions: Array<{ name: string; totalTimeMs: number }>,
  totalTimeMs: number
) {
  const sorted = [...cpuFunctions].sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  return {
    name: "root",
    value: totalTimeMs || 1,
    children: sorted.map((fn) => ({
      name: fn.name,
      value: fn.totalTimeMs,
      children: [],
    })),
  };
}

function buildTimelineEvents(
  gpuKernels: Array<{ name: string; totalTimeMs: number; count: number }>,
  memcpyTimeMs: number
) {
  const events: Array<{
    id: string;
    name: string;
    type: string;
    startTime: number;
    endTime: number;
    stream: number;
    relatedFlamegraphNodes: string[];
  }> = [];
  let cursor = 0;
  let idx = 0;

  for (const kernel of gpuKernels) {
    const avgDuration = kernel.totalTimeMs / kernel.count;
    for (let i = 0; i < kernel.count; i++) {
      events.push({
        id: `gpu-${idx++}`,
        name: kernel.name,
        type: kernel.name.toLowerCase().includes("memcpy") ? "Memory" : "Kernel",
        startTime: cursor,
        endTime: cursor + avgDuration,
        stream: 1,
        relatedFlamegraphNodes: [],
      });
      cursor += avgDuration;
    }
  }

  if (memcpyTimeMs > 0) {
    events.push({
      id: `gpu-${idx++}`,
      name: "memcpy",
      type: "Memory",
      startTime: cursor,
      endTime: cursor + memcpyTimeMs,
      stream: 2,
      relatedFlamegraphNodes: [],
    });
  }

  return events;
}

/* ================= SESSION PANEL ================= */

function SessionPanel({ sessionId, metrics }: { sessionId: number; metrics: SessionMetrics }) {
  const flamegraphData = buildFlamegraphData(metrics.cpuFunctions, metrics.cpuTotalTimeMs);
  const timelineEvents = buildTimelineEvents(metrics.gpuKernels, metrics.memcpyTimeMs);

  return (
    <CorrelationProvider>
      <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16, background: "#1e1e1e" }}>
        <h4 style={{ margin: "0 0 16px 0", color: "#646cff", fontSize: 15 }}>
          Session {sessionId}
        </h4>

        {/* Flamegraph */}
        <div style={{ marginBottom: 20 }}>
          <h5 style={{ margin: "0 0 8px 0", color: "#888", fontSize: 12, textTransform: "uppercase" }}>
            CPU Flamegraph
          </h5>
          {metrics.cpuFunctions.length > 0 ? (
            <CorrelatedFlamegraph data={flamegraphData} height={250} />
          ) : (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13, background: "#2a2a2a", borderRadius: 6 }}>
              No CPU data
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <h5 style={{ margin: "0 0 8px 0", color: "#888", fontSize: 12, textTransform: "uppercase" }}>
            GPU Timeline
          </h5>
          {timelineEvents.length > 0 ? (
            <CorrelatedTimeline
              events={timelineEvents}
              height={120}
              criticalPathEventIds={[]}
              showCriticalPath={false}
            />
          ) : (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13, background: "#2a2a2a", borderRadius: 6 }}>
              No GPU data
            </div>
          )}
        </div>
      </div>
    </CorrelationProvider>
  );
}

/* ================= COMPONENT ================= */

export default function CompareRuns() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const sessionIds = useMemo(
    () => parseSessionIds(searchParams.get("ids")),
    [searchParams]
  );

  const [data, setData] = useState<SessionComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (sessionIds.length < 2) {
        setData([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          sessionIds.map(async (id) => {
            const metrics = await fetchSessionMetrics(String(id));
            return { sessionId: id, metrics };
          })
        );

        if (!cancelled) setData(results);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load comparison data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionIds]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading comparison…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "#e74c3c" }}>{error}</p>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "#888" }}>Select at least two sessions to compare.</p>
        <button onClick={() => navigate("/")}>← Back to Dashboard</button>
      </div>
    );
  }

  const [runA, runB] = data;

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <button
          onClick={() => navigate("/")}
          style={{ padding: "8px 16px", background: "transparent", color: "#646cff", border: "1px solid #646cff", borderRadius: "6px", cursor: "pointer" }}
        >
          ← Back
        </button>
        <button
          onClick={() => { if (reportRef.current) exportElementToPdf(reportRef.current, `grof-compare-${data.map((d) => d.sessionId).join("-")}.pdf`); }}
          style={{ padding: "8px 16px", background: "#2ecc71", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
        >
          📄 Export PDF Report
        </button>
      </div>

      <div ref={reportRef}>
        <h1 style={{ marginBottom: 8 }}>Compare Runs</h1>
        <p style={{ color: "#888", marginBottom: 28 }}>Session {runA.sessionId} vs Session {runB.sessionId}</p>

        {/* Side-by-side flamegraph + timeline */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 14 }}>📈 Side-by-Side Trace View</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.map((d) => (
              <SessionPanel key={d.sessionId} sessionId={d.sessionId} metrics={d.metrics} />
            ))}
          </div>
        </section>

        {/* Metrics diff table */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 14 }}>📊 Metrics Comparison</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#1e1e1e", borderRadius: 8, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#2a2a2a" }}>
                <th style={thStyle}>Metric</th>
                <th style={thStyle}>Session {runA.sessionId} (A)</th>
                <th style={thStyle}>Session {runB.sessionId} (B)</th>
                <th style={thStyle}>Δ (B − A)</th>
              </tr>
            </thead>
            <tbody>
              <MetricRowWithDelta label="Total Time (ms)" values={data.map((d) => d.metrics.totalTimeMs)} lowerIsBetter />
              <MetricRowWithDelta label="GPU Active Time (ms)" values={data.map((d) => d.metrics.gpuTotalTimeMs)} lowerIsBetter={false} />
              <MetricRowWithDelta label="GPU Idle Time (ms)" values={data.map((d) => d.metrics.gpuIdleTimeMs)} lowerIsBetter />
              <MetricRowWithDelta label="Memcpy Time (ms)" values={data.map((d) => d.metrics.memcpyTimeMs)} lowerIsBetter />
              <MetricRowWithDelta label="CPU Active Time (ms)" values={data.map((d) => d.metrics.cpuTotalTimeMs)} lowerIsBetter />
            </tbody>
          </table>
        </section>

        {/* Kernel analysis */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 14 }}>🔬 Kernel Analysis (Side-by-Side)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.map((d) => (
              <div key={d.sessionId} style={{ background: "#1e1e1e", borderRadius: 8, padding: 16, border: "1px solid #333" }}>
                <h3 style={{ margin: "0 0 12px 0", color: "#646cff", fontSize: 14 }}>Session {d.sessionId}</h3>
                <KernelAnalysisTable kernels={d.metrics.gpuKernels} />
                {d.metrics.gpuKernels.length === 0 && (
                  <p style={{ color: "#555", fontSize: 13 }}>No kernel data available yet.</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Performance Insights */}
        <section>
          <h2 style={{ marginBottom: 14 }}>💡 Performance Insights</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.map((d) => (
              <RecommendationsPanel key={d.sessionId} metrics={d.metrics} sessionLabel={`Session ${d.sessionId}`} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontWeight: 600,
  fontSize: 13,
  color: "#aaa",
};

function MetricRowWithDelta({ label, values, lowerIsBetter }: { label: string; values: number[]; lowerIsBetter: boolean }) {
  const a = values[0] ?? 0;
  const b = values[1] ?? 0;
  const delta = b - a;
  const percent = a !== 0 ? (delta / a) * 100 : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const unchanged = delta === 0;
  const deltaColor = unchanged ? "#888" : improved ? "#2ecc71" : "#e74c3c";
  const deltaSymbol = unchanged ? "—" : improved ? "✔" : "✗";

  return (
    <tr style={{ borderTop: "1px solid #2a2a2a" }}>
      <td style={{ padding: "10px 16px", color: "#ddd" }}>{label}</td>
      <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{Math.round(a)} ms</td>
      <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{Math.round(b)} ms</td>
      <td style={{ padding: "10px 16px", fontFamily: "monospace", color: deltaColor, fontWeight: 600 }}>
        {delta > 0 ? "+" : ""}{delta.toFixed(1)} ms ({percent.toFixed(1)}%) {deltaSymbol}
      </td>
    </tr>
  );
}