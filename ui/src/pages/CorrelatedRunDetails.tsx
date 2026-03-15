/**
 * CorrelatedRunDetails
 * Uses real session data from the API for all visualizations.
 * Critical path remains mocked until backend endpoint is implemented.
 */

import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CorrelationProvider, useCorrelation } from "../context/CorrelationContext";
import { buildFlamegraphData, buildTimelineEvents } from "../utils/traceBuilders";
import CorrelatedFlamegraph from "../components/CorrelatedFlamegraph";
import CorrelatedTimeline from "../components/CorrelatedTimeline";
import ConnectionThread from "../components/ConnectionThread";
import CriticalPathInsight from "../components/CriticalPathInsight";
import CriticalPathToggle from "../components/CriticalPathToggle";
import { useSession } from "../hooks/useSession";
// TODO: replace when backend exposes /sessions/:id/critical-path
import { mockCriticalPath, mockCriticalPathInsight, getCriticalPathEventIds } from "../data/mockCriticalPath";
import { useCriticalPath } from "../hooks/useCriticalPath";

/* ── Data mappers live in src/utils/traceBuilders.ts ─────────────────────── */

/* ── Inner component ──────────────────────────────────────────────────────── */

function CorrelatedRunDetailsInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const flamegraphRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { state, clearSelection } = useCorrelation();
  const { selection } = state;

  const [showCriticalPath, setShowCriticalPath] = useState(false);
  
  // Real critical path data via hook
  const { data: cpData, loading: cpLoading, error: cpError } = useCriticalPath(id);
  const criticalPathInsight = cpData?.insight ?? mockCriticalPathInsight;
  const criticalPathEvents = cpData?.criticalPath ?? mockCriticalPath;
  const criticalPathEventIds = cpData?.eventIds ?? getCriticalPathEventIds();

  // ── Real data via hook ──────────────────────────────────────────────────
  const { data: metrics, loading, error } = useSession(id);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        Loading session…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center", color: "#F43F5E", background: "#090A0C", minHeight: "100vh" }}>
        <p style={{ fontSize: 18, marginBottom: 24 }}>Failed to load session: {error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            background: "rgba(99, 102, 241, 0.1)",
            color: "#818CF8",
            border: "1px solid #6366F1",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#6366F1"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)"; e.currentTarget.style.color = "#818CF8"; }}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const totalMs = metrics?.totalTimeMs ?? 0;
  
  const formatPct = (part: number, total: number) => {
    if (!total || part === 0) return "0";
    const raw = (part / total) * 100;
    if (raw < 0.01) return "<0.01";
    if (raw < 1) return raw.toFixed(2);
    return Math.round(raw).toString();
  };

  const cpuUsagePct = metrics ? formatPct(metrics.cpuTotalTimeMs, totalMs) : "0";
  const gpuUsagePct = metrics ? formatPct(metrics.gpuTotalTimeMs, totalMs) : "0";
  const durationSec = Math.round(totalMs / 1000);

  const flamegraphData = metrics
    ? buildFlamegraphData(metrics.cpuFunctions, metrics.cpuTotalTimeMs)
    : null;

  const timelineEvents = metrics
    ? buildTimelineEvents(metrics.gpuKernels, metrics.memcpyTimeMs)
    : [];

  // Derive critical path sets from the loaded path data (name-based matching,
  // since backend node IDs are independent from our synthetic frontend IDs).
  const cpuCriticalNames = new Set(
    criticalPathEvents.nodes
      .filter((n) => n.isCritical && n.type === "cpu")
      .map((n) => n.name)
  );
  const gpuCriticalNames = new Set(
    criticalPathEvents.nodes
      .filter((n) => n.isCritical && n.type !== "cpu")
      .map((n) => n.name)
  );
  // IDs of timeline events whose kernel name appears on the critical path
  const criticalTimelineIds = timelineEvents
    .filter((e) => gpuCriticalNames.has(e.name))
    .map((e) => e.id);

  return (
    <div style={{ 
      padding: "40px 48px", 
      width: "100%", 
      minHeight: "100vh", 
      background: "#090A0C", 
      color: "#F8FAFC", 
      boxSizing: "border-box", 
      position: "relative" 
    }}>
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "#94A3B8",
            border: "1px solid #262933",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "24px",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#13151A"; e.currentTarget.style.color = "#F8FAFC"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>Session Details</h1>
            <p style={{ color: "#94A3B8", margin: 0, fontSize: 15 }}>
              Session ID: <code style={{ fontFamily: 'SFMono-Regular, Consolas, monospace', background: "#13151A", padding: "4px 8px", borderRadius: 6, border: "1px solid #262933" }}>{id}</code>
            </p>
          </div>

          {selection.type && (
            <div style={{
              background: "rgba(30, 30, 30, 0.95)",
              border: `1px solid ${selection.type === "flamegraph" ? "#00ff88" : "#ffd700"}`,
              padding: "8px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: selection.type === "flamegraph" ? "#00ff88" : "#ffd700",
                boxShadow: `0 0 6px ${selection.type === "flamegraph" ? "#00ff88" : "#ffd700"}`,
              }} />
              <span style={{ color: "#fff", fontWeight: "500" }}>
                {selection.type === "flamegraph" ? "CPU → GPU" : "GPU → CPU"}
              </span>
              <span style={{ color: "#666" }}>|</span>
              <span style={{ color: "#888" }}>{selection.relatedIds.length} linked</span>
              <button
                onClick={clearSelection}
                style={{
                  background: "transparent", border: "1px solid #444",
                  borderRadius: "4px", padding: "2px 8px", cursor: "pointer",
                  color: "#888", fontSize: "11px", marginLeft: "4px",
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session Info Cards — all real values */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        marginBottom: "32px",
      }}>
        {[
          {
            label: "Duration",
            value: durationSec > 0
              ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
              : "—",
            color: "#F8FAFC",
          },
          { label: "GPU Usage", value: `${gpuUsagePct}%`, color: "#8B5CF6" },
          { label: "CPU Usage", value: `${cpuUsagePct}%`, color: "#0EA5E9" },
          {
            label: "GPU Kernels",
            value: String(metrics?.gpuKernels.length ?? "—"),
            color: "#10B981",
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ 
            background: "#13151A", 
            border: "1px solid #262933",
            padding: "24px", 
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#94A3B8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</h3>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", fontFamily: 'SFMono-Regular, Consolas, monospace', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Correlation Instructions */}
      <div style={{
        background: "rgba(99, 102, 241, 0.05)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: "12px", padding: "20px 24px", marginBottom: "32px",
      }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#818CF8", fontSize: "15px", fontWeight: "600" }}>
          CPU-GPU Correlation
        </h3>
        <p style={{ margin: 0, color: "#94A3B8", fontSize: "14px", lineHeight: 1.5 }}>
          <strong style={{ color: "#F8FAFC" }}>Click a function</strong> in the Flamegraph to see which GPU kernels it launched.{" "}
          <strong style={{ color: "#F8FAFC" }}>Click a GPU event</strong> in the Timeline to see which CPU function triggered it.
        </p>
      </div>

      {/* Critical Path — still mock until backend implements /sessions/:id/critical-path */}
      {showCriticalPath && cpLoading && (
        <div style={{ padding: "20px", color: "#888" }}>Loading critical path data...</div>
      )}
      {showCriticalPath && cpError && (
        <div style={{ padding: "20px", color: "#e74c3c" }}>Failed to load critical path data: {cpError}</div>
      )}
      {showCriticalPath && !cpLoading && !cpError && (
        <CriticalPathInsight criticalPath={criticalPathEvents} insight={criticalPathInsight} />
      )}

      {/* Main Visualization Container */}
      <div style={{ position: "relative" }}>
        <section ref={flamegraphRef} style={{ 
          marginBottom: "40px", 
          background: "#13151A", 
          padding: 24, 
          borderRadius: 16, 
          border: "1px solid #262933",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}>
          <h2 style={{ margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: "10px", fontSize: 20, fontWeight: 600 }}>
            <span>CPU Flamegraph</span>
          </h2>
          {flamegraphData ? (
            <div style={{ background: "#090A0C", padding: 4, borderRadius: 8 }}>
              <CorrelatedFlamegraph
                data={flamegraphData}
                height={500}
                showCriticalPath={showCriticalPath}
                criticalPathNames={cpuCriticalNames}
              />
            </div>
          ) : (
            <div style={{ color: "#94A3B8", padding: "40px", textAlign: "center" }}>No CPU data available.</div>
          )}
        </section>

        <section ref={timelineRef} style={{ 
          background: "#13151A", 
          padding: 24, 
          borderRadius: 16, 
          border: "1px solid #262933",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: 20, fontWeight: 600 }}>
              <span>GPU Timeline</span>
            </h2>
            <CriticalPathToggle
              enabled={showCriticalPath}
              onToggle={setShowCriticalPath}
              criticalEventCount={criticalPathEventIds.length}
            />
          </div>
          <div style={{ background: "#090A0C", padding: "16px 4px", borderRadius: 8 }}>
            <CorrelatedTimeline
              events={timelineEvents}
              height={350}
              criticalPathEventIds={criticalTimelineIds}
              showCriticalPath={showCriticalPath}
            />
          </div>
        </section>

        <ConnectionThread flamegraphRef={flamegraphRef} timelineRef={timelineRef} />
      </div>
      </div>
    </div>
  );
}

export default function CorrelatedRunDetails() {
  return (
    <CorrelationProvider>
      <CorrelatedRunDetailsInner />
    </CorrelationProvider>
  );
}
