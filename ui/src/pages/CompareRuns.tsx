import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { RawSession } from "../types/rawSession";

/* ===== API ===== */
import { fetchFlamegraph } from "../api/flamegraph";
import { fetchCriticalPath } from "../api/criticalPath";

/* ===== UTILS ===== */
import { aggregateSessionMetrics } from "../utils/aggregateSessionMetrics";
import { exportElementToPdf } from "../utils/exportPdf";

/* ===== TYPES ===== */
import type { SessionMetrics } from "../types/comparison";

/* ===== COMPONENTS ===== */
import KernelAnalysisTable from "../components/KernelAnalysisTable";
import RecommendationsPanel from "../components/RecommendationsPanel";

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
            const [flamegraph, criticalPath] = await Promise.all([
              fetchFlamegraph(String(id)),
              fetchCriticalPath(String(id)),
            ]);

            // cpu_samples and gpu_events are empty: backend GET endpoints
            // are not yet available (see UPDATE-M2-siwar.md §5).
            const metricsInput: RawSession = {
              id: String(id),
              start_time: (flamegraph as unknown as Record<string, number>).start_time ?? 0,
              end_time: (flamegraph as unknown as Record<string, number>).end_time ?? 0,
              cpu_samples: [],
              gpu_events: [],
            };

            (metricsInput as unknown as Record<string, unknown>).flamegraph = flamegraph;
            (metricsInput as unknown as Record<string, unknown>).criticalPath = criticalPath;

            const metrics = aggregateSessionMetrics(metricsInput);
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

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
        Loading comparison…
      </div>
    );
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

      {/* ── Toolbar (outside report so it's not in the PDF) ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "#646cff",
            border: "1px solid #646cff",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <button
          onClick={() => {
            if (reportRef.current) {
              exportElementToPdf(
                reportRef.current,
                `grof-compare-${data.map((d) => d.sessionId).join("-")}.pdf`
              );
            }
          }}
          style={{
            padding: "8px 16px",
            background: "#2ecc71",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          📄 Export PDF Report
        </button>
      </div>

      {/* ── Printable report area ── */}
      <div ref={reportRef}>
        <h1 style={{ marginBottom: 8 }}>Compare Runs</h1>
        <p style={{ color: "#888", marginBottom: 28 }}>
          Session {runA.sessionId} vs Session {runB.sessionId}
        </p>

        {/* ── Side-by-side visual placeholder ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 14 }}>📈 Side-by-Side Trace View</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.map((d) => (
              <div
                key={d.sessionId}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: 16,
                  background: "#1e1e1e",
                }}
              >
                <h4 style={{ margin: "0 0 12px 0", color: "#646cff" }}>
                  Session {d.sessionId}
                </h4>
                <div
                  style={{
                    height: 160,
                    background: "#2a2a2a",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#555",
                    fontSize: 13,
                  }}
                >
                  Flamegraph / Timeline — available in detail view
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Metrics diff table ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 14 }}>📊 Metrics Comparison</h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#1e1e1e",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#2a2a2a" }}>
                <th style={thStyle}>Metric</th>
                <th style={thStyle}>Session {runA.sessionId} (A)</th>
                <th style={thStyle}>Session {runB.sessionId} (B)</th>
                <th style={thStyle}>Δ (B − A)</th>
              </tr>
            </thead>
            <tbody>
              <MetricRowWithDelta
                label="Total Time (ms)"
                values={data.map((d) => d.metrics.totalTimeMs)}
                lowerIsBetter
              />
              <MetricRowWithDelta
                label="GPU Active Time (ms)"
                values={data.map((d) => d.metrics.gpuTotalTimeMs)}
                lowerIsBetter={false}
              />
              <MetricRowWithDelta
                label="GPU Idle Time (ms)"
                values={data.map((d) => d.metrics.gpuIdleTimeMs)}
                lowerIsBetter
              />
              <MetricRowWithDelta
                label="Memcpy Time (ms)"
                values={data.map((d) => d.metrics.memcpyTimeMs)}
                lowerIsBetter
              />
              <MetricRowWithDelta
                label="CPU Active Time (ms)"
                values={data.map((d) => d.metrics.cpuTotalTimeMs)}
                lowerIsBetter
              />
            </tbody>
          </table>
        </section>

        {/* ── Kernel analysis side-by-side ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 14 }}>🔬 Kernel Analysis (Side-by-Side)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.map((d) => (
              <div
                key={d.sessionId}
                style={{
                  background: "#1e1e1e",
                  borderRadius: 8,
                  padding: 16,
                  border: "1px solid #333",
                }}
              >
                <h3 style={{ margin: "0 0 12px 0", color: "#646cff", fontSize: 14 }}>
                  Session {d.sessionId}
                </h3>
                <KernelAnalysisTable kernels={d.metrics.gpuKernels} />
                {d.metrics.gpuKernels.length === 0 && (
                  <p style={{ color: "#555", fontSize: 13 }}>No kernel data available yet.</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Performance Insights side-by-side ── */}
        <section>
          <h2 style={{ marginBottom: 14 }}>💡 Performance Insights</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.map((d) => (
              <RecommendationsPanel
                key={d.sessionId}
                metrics={d.metrics}
                sessionLabel={`Session ${d.sessionId}`}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontWeight: 600,
  fontSize: 13,
  color: "#aaa",
};

/* ================= HELPER COMPONENT ================= */

function MetricRowWithDelta({
  label,
  values,
  lowerIsBetter,
}: {
  label: string;
  values: number[];
  lowerIsBetter: boolean;
}) {
  const a = values[0] ?? 0;
  const b = values[1] ?? 0;

  const delta = b - a;
  const percent = a !== 0 ? (delta / a) * 100 : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const unchanged = delta === 0;

  const deltaColor = unchanged ? "#888" : improved ? "#2ecc71" : "#e74c3c";
  const deltaSymbol = unchanged ? "—" : improved ? "✓" : "✗";

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
