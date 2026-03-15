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
    id: "root",
    name: "root",
    value: totalTimeMs || 1,
    children: sorted.map((fn, idx) => ({
      id: `child-${idx}`,
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
    type: "CUDA" | "Memory" | "Kernel";
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

// --- PREMIUM THEME CONSTANTS ---
const theme = {
  bgApp: "#090A0C",
  bgSurface: "#13151A",
  bgSurfaceHighlight: "#1A1C23",
  border: "#262933",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  accent: "#6366F1",
  success: "#10B981",
  danger: "#EF4444",
  tableHead: "#101115",
  radius: "12px",
  shadow: "0 4px 20px rgba(0,0,0,0.5)",
  glow: "0 0 15px rgba(99, 102, 241, 0.15)"
};

/* ================= SESSION PANEL ================= */

function SessionPanel({ sessionId, metrics }: { sessionId: number; metrics: SessionMetrics }) {
  const flamegraphData = buildFlamegraphData(metrics.cpuFunctions, metrics.cpuTotalTimeMs);
  const timelineEvents = buildTimelineEvents(metrics.gpuKernels, metrics.memcpyTimeMs);

  return (
    <CorrelationProvider>
      <div style={{ 
        border: `1px solid ${theme.border}`, 
        borderRadius: theme.radius, 
        padding: 24, 
        background: theme.bgSurface,
        boxShadow: theme.shadow,
        flex: "1 1 0",
        minWidth: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "rgba(99,102,241,0.1)", color: theme.accent, padding: "4px 10px", borderRadius: "16px", fontSize: 13, fontWeight: 600 }}>
            Session {sessionId}
          </div>
          <h4 style={{ margin: 0, color: theme.textPrimary, fontSize: 16, fontWeight: 500 }}>Performance Trace</h4>
        </div>

        {/* Flamegraph */}
        <div style={{ marginBottom: 24 }}>
          <h5 style={{ margin: "0 0 12px 0", color: theme.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            CPU Flamegraph
          </h5>
          <div style={{ background: theme.bgSurfaceHighlight, padding: "2px", borderRadius: "8px", border: `1px solid ${theme.border}`, overflowX: "auto" }}>
            {metrics.cpuFunctions.length > 0 ? (
              <CorrelatedFlamegraph data={flamegraphData} height={250} />
            ) : (
              <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSecondary, fontSize: 13 }}>
                No CPU trace data available.
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h5 style={{ margin: "0 0 12px 0", color: theme.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            GPU Timeline
          </h5>
          <div style={{ background: theme.bgSurfaceHighlight, padding: "2px", borderRadius: "8px", border: `1px solid ${theme.border}`, overflowX: "auto" }}>
            {timelineEvents.length > 0 ? (
              <CorrelatedTimeline
                events={timelineEvents}
                height={120}
                criticalPathEventIds={[]}
                showCriticalPath={false}
              />
            ) : (
              <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSecondary, fontSize: 13 }}>
                No GPU trace data available.
              </div>
            )}
          </div>
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
        if (!cancelled) setError("Failed to load comparison data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionIds]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: theme.textSecondary, fontSize: 16 }}>Loading deep comparison engine…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: theme.danger, marginBottom: 20, fontSize: 16 }}>{error}</p>
        <button 
          onClick={() => navigate("/")}
          style={{ padding: "10px 20px", background: theme.bgSurfaceHighlight, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: "8px", cursor: "pointer" }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: theme.textSecondary, marginBottom: 20 }}>Select at least two sessions from the dashboard to compare.</p>
        <button 
          onClick={() => navigate("/")}
          style={{ padding: "10px 20px", background: theme.bgSurfaceHighlight, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: "8px", cursor: "pointer" }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: theme.bgApp, minHeight: "100vh", padding: "40px 20px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Header Ribbon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, borderBottom: `1px solid ${theme.border}`, paddingBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <button
                onClick={() => navigate("/")}
                style={{ background: "transparent", color: theme.textSecondary, border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}
              >
                ← Back to Dashboard
              </button>
            </div>
            <h1 style={{ margin: "0 0 8px 0", color: theme.textPrimary, fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Run Comparison
            </h1>
            <p style={{ margin: 0, color: theme.textSecondary, fontSize: 15 }}>
              Analyzing {data.length} sessions (Baseline: Session {data[0].sessionId})
            </p>
          </div>
          <button
            onClick={() => { if (reportRef.current) exportElementToPdf(reportRef.current, `grof-compare-${data.map((d) => d.sessionId).join("-")}.pdf`); }}
            style={{ 
              padding: "10px 20px", 
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)", 
              color: "#fff", 
              border: "none", 
              borderRadius: "8px", 
              cursor: "pointer", 
              fontWeight: 600,
              boxShadow: theme.glow,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Complete Report
          </button>
        </div>

        <div ref={reportRef}>
          
          {/* Top Level Summary Table */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 8, height: 24, background: theme.accent, borderRadius: 4 }}></div>
              <h2 style={{ margin: 0, color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>Execution Summary</h2>
            </div>
            
            <div style={{ 
              background: theme.bgSurface, 
              borderRadius: theme.radius, 
              border: `1px solid ${theme.border}`,
              overflow: "hidden",
              boxShadow: theme.shadow
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                  <thead>
                    <tr style={{ background: theme.tableHead, borderBottom: `1px solid ${theme.border}` }}>
                      <th style={thStyle}>Metric</th>
                      {data.map((d, i) => (
                        <th key={d.sessionId} style={thStyle}>
                          <div style={{ color: theme.textPrimary, fontSize: 14 }}>Session {d.sessionId}</div>
                          {i === 0 && <div style={{ fontSize: 11, color: theme.accent, marginTop: 2 }}>BASELINE</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <MetricRowWithDelta label="Total Wall Time" values={data.map((d) => d.metrics.totalTimeMs)} lowerIsBetter theme={theme} />
                    <MetricRowWithDelta label="GPU Active Compute" values={data.map((d) => d.metrics.gpuTotalTimeMs)} lowerIsBetter={false} theme={theme} />
                    <MetricRowWithDelta label="GPU Idle Overlap" values={data.map((d) => d.metrics.gpuIdleTimeMs)} lowerIsBetter theme={theme} />
                    <MetricRowWithDelta label="Memory Transfers (PCIe)" values={data.map((d) => d.metrics.memcpyTimeMs)} lowerIsBetter theme={theme} />
                    <MetricRowWithDelta label="CPU Time" values={data.map((d) => d.metrics.cpuTotalTimeMs)} lowerIsBetter theme={theme} />
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Trace Layout - Conditional based on count */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 8, height: 24, background: "#8B5CF6", borderRadius: 4 }}></div>
              <h2 style={{ margin: 0, color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>Visual Traces</h2>
            </div>
            
            <div style={{ 
              display: data.length <= 2 ? "grid" : "flex", 
              gridTemplateColumns: data.length <= 2 ? "1fr 1fr" : "none",
              flexDirection: data.length <= 2 ? "row" : "column",
              gap: 24 
            }}>
              {data.map((d) => (
                <SessionPanel key={d.sessionId} sessionId={d.sessionId} metrics={d.metrics} />
              ))}
            </div>
          </section>

          {/* Kernel analysis */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 8, height: 24, background: "#10B981", borderRadius: 4 }}></div>
              <h2 style={{ margin: 0, color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>Kernel Efficiency Analysis</h2>
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: `repeat(auto-fit, minmax(450px, 1fr))`, 
              gap: 24 
            }}>
              {data.map((d) => (
                <div key={d.sessionId} style={{ 
                  background: theme.bgSurfaceHighlight, 
                  borderRadius: theme.radius, 
                  padding: "0", 
                  border: `1px solid ${theme.border}`,
                  boxShadow: theme.shadow,
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, background: theme.bgSurface }}>
                    <h3 style={{ margin: 0, color: theme.textPrimary, fontSize: 15, fontWeight: 600 }}>Session {d.sessionId}</h3>
                  </div>
                  <div style={{ padding: 0 }}>
                    <KernelAnalysisTable kernels={d.metrics.gpuKernels} />
                    {d.metrics.gpuKernels.length === 0 && (
                      <p style={{ color: theme.textSecondary, fontSize: 13, padding: 20, textAlign: "center", margin: 0 }}>No kernel calls found.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Performance Insights */}
          <section style={{ paddingBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 8, height: 24, background: "#F59E0B", borderRadius: 4 }}></div>
              <h2 style={{ margin: 0, color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>AI Performance Insights</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(400px, 1fr))`, gap: 24 }}>
              {data.map((d) => (
                <div key={d.sessionId} style={{ 
                  background: theme.bgSurface, 
                  borderRadius: theme.radius,
                  border: `1px solid ${theme.border}`,
                  boxShadow: theme.shadow,
                  overflow: "hidden"
                }}>
                  <div style={{ padding: 20, height: "100%" }}>
                    <RecommendationsPanel metrics={d.metrics} sessionLabel={`Session ${d.sessionId}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "16px 20px",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#94A3B8",
};

interface MetricRowProps {
  label: string;
  values: number[];
  lowerIsBetter: boolean;
  theme: any;
}

function MetricRowWithDelta({ label, values, lowerIsBetter, theme }: MetricRowProps) {
  const baseline = values[0] ?? 0;

  return (
    <tr style={{ borderTop: `1px solid ${theme.border}`, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: "16px 20px", color: theme.textSecondary, whiteSpace: "nowrap", fontWeight: 500 }}>{label}</td>
      {values.map((val, idx) => {
        if (idx === 0) {
          return (
             <td key={idx} style={{ padding: "16px 20px", fontFamily: "'SF Mono', Consolas, monospace", color: theme.textPrimary, fontSize: 15 }}>
               {val.toFixed(2)} <span style={{fontSize: 12, color: theme.textSecondary}}>ms</span>
             </td>
          );
        }
        const delta = val - baseline;
        const percent = baseline !== 0 ? (delta / baseline) * 100 : 0;
        const improved = lowerIsBetter ? delta < 0 : delta > 0;
        const unchanged = Math.abs(delta) < 0.01;
        const deltaColor = unchanged ? theme.textSecondary : improved ? theme.success : theme.danger;
        const deltaSymbol = unchanged ? "" : improved ? "↓" : "↑";

        return (
          <td key={idx} style={{ padding: "16px 20px" }}>
            <div style={{ fontFamily: "'SF Mono', Consolas, monospace", color: theme.textPrimary, fontSize: 15, marginBottom: 4 }}>
              {val.toFixed(2)} <span style={{fontSize: 12, color: theme.textSecondary}}>ms</span>
            </div>
            <div style={{ 
              display: "inline-block",
              background: unchanged ? "transparent" : `${deltaColor}15`,
              color: deltaColor, 
              fontWeight: 600, 
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: "4px"
            }}>
              {delta > 0 && !unchanged ? "+" : ""}{delta.toFixed(2)} ms ({percent > 0 && !unchanged ? "+" : ""}{percent.toFixed(1)}%) {deltaSymbol}
            </div>
          </td>
        );
      })}
    </tr>
  );
}