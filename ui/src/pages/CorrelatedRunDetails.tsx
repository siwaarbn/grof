/**
 * CorrelatedRunDetails
 * Uses real session data from the API for all visualizations.
 * Critical path remains mocked until backend endpoint is implemented.
 */

import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CorrelationProvider, useCorrelation } from "../context/CorrelationContext";
import CorrelatedFlamegraph from "../components/CorrelatedFlamegraph";
import CorrelatedTimeline from "../components/CorrelatedTimeline";
import ConnectionThread from "../components/ConnectionThread";
import FlamegraphLegend from "../components/FlamegraphLegend";
import CriticalPathInsight from "../components/CriticalPathInsight";
import CriticalPathToggle from "../components/CriticalPathToggle";
import { useSession } from "../hooks/useSession";
// TODO: replace when backend exposes /sessions/:id/critical-path
import { mockCriticalPath, mockCriticalPathInsight, getCriticalPathEventIds } from "../data/mockCriticalPath";

/* ── Data mappers ─────────────────────────────────────────────────────────── */

/**
 * Maps flat CpuFunctionMetric[] to the nested flamegraph node format.
 * Functions are sorted by total time descending so the hottest paths appear first.
 */
function buildFlamegraphData(
  cpuFunctions: Array<{ name: string; totalTimeMs: number }>,
  totalTimeMs: number
) {
  const sorted = [...cpuFunctions].sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  return {
    name: "root",
    value: totalTimeMs,
    children: sorted.map((fn) => ({
      name: fn.name,
      value: fn.totalTimeMs,
      children: [],
    })),
  };
}

/**
 * Maps GpuKernelMetric[] + memcpyTimeMs to the timeline event format.
 * Assigns synthetic start times by accumulating durations sequentially.
 * Replace with real start_time values once the backend exposes them.
 */
function buildTimelineEvents(
  gpuKernels: Array<{ name: string; totalTimeMs: number; count: number }>,
  memcpyTimeMs: number
) {
  // CorrelatedTimeline expects CorrelatedGpuEvent shape:
  // { id, name, type, startTime, endTime, stream, relatedFlamegraphNodes }
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

/* ── Inner component ──────────────────────────────────────────────────────── */

function CorrelatedRunDetailsInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const flamegraphRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { state, clearSelection } = useCorrelation();
  const { selection } = state;

  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const criticalPathEventIds = getCriticalPathEventIds();

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
      <div style={{ padding: "40px", textAlign: "center", color: "#e74c3c" }}>
        <p>Failed to load session: {error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            background: "transparent",
            color: "#646cff",
            border: "1px solid #646cff",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Derive display values from real metrics ─────────────────────────────
  const totalMs = metrics?.totalTimeMs ?? 0;
  const cpuUsagePct = totalMs > 0
    ? Math.min(100, Math.round((metrics!.cpuTotalTimeMs / totalMs) * 100))
    : 0;
  const gpuUsagePct = totalMs > 0
    ? Math.min(100, Math.round((metrics!.gpuTotalTimeMs / totalMs) * 100))
    : 0;
  const durationSec = Math.round(totalMs / 1000);

  const flamegraphData = metrics
    ? buildFlamegraphData(metrics.cpuFunctions, metrics.cpuTotalTimeMs)
    : null;

  const timelineEvents = metrics
    ? buildTimelineEvents(metrics.gpuKernels, metrics.memcpyTimeMs)
    : [];

  return (
    <div style={{ padding: "20px", width: "100%", boxSizing: "border-box", position: "relative" }}>

      {/* Header */}
      <div style={{ marginBottom: "30px" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "#646cff",
            border: "1px solid #646cff",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginBottom: "10px" }}>Session {id}</h1>
            <p style={{ color: "#888", margin: 0 }}>
              Session ID: <code>{id}</code>
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
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "30px",
      }}>
        {[
          {
            label: "Duration",
            value: durationSec > 0
              ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
              : "—",
            color: "#fff",
          },
          { label: "GPU Usage", value: `${gpuUsagePct}%`, color: "#9b59b6" },
          { label: "CPU Usage", value: `${cpuUsagePct}%`, color: "#3498db" },
          {
            label: "GPU Kernels",
            value: String(metrics?.gpuKernels.length ?? "—"),
            color: "#2ecc71",
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#888", fontSize: "14px" }}>{label}</h3>
            <p style={{ margin: 0, fontSize: "24px", fontWeight: "600", color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Correlation Instructions */}
      <div style={{
        background: "linear-gradient(135deg, rgba(100, 108, 255, 0.1), rgba(100, 108, 255, 0.05))",
        border: "1px solid rgba(100, 108, 255, 0.3)",
        borderRadius: "8px", padding: "16px 20px", marginBottom: "20px",
      }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#646cff", fontSize: "14px", fontWeight: "600" }}>
          CPU-GPU Correlation
        </h3>
        <p style={{ margin: 0, color: "#aaa", fontSize: "13px" }}>
          <strong>Click a function</strong> in the Flamegraph to see which GPU kernels it launched.{" "}
          <strong>Click a GPU event</strong> in the Timeline to see which CPU function triggered it.
        </p>
      </div>

      {/* Critical Path — still mock until backend implements /sessions/:id/critical-path */}
      {showCriticalPath && (
        <CriticalPathInsight criticalPath={mockCriticalPath} insight={mockCriticalPathInsight} />
      )}

      {/* Main Visualization Container */}
      <div style={{ position: "relative" }}>
        <section ref={flamegraphRef} style={{ marginBottom: "40px" }}>
          <h2 style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#e74c3c" }}>●</span> CPU Flamegraph
            <span style={{ fontSize: "14px", color: "#888", fontWeight: "400" }}>(Click to correlate)</span>
          </h2>
          <FlamegraphLegend />
          {flamegraphData ? (
            <CorrelatedFlamegraph data={flamegraphData} height={500} />
          ) : (
            <div style={{ color: "#888", padding: "20px" }}>No CPU data available.</div>
          )}
        </section>

        <section ref={timelineRef}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#9b59b6" }}>●</span> GPU Timeline
              <span style={{ fontSize: "14px", color: "#888", fontWeight: "400" }}>(Click to correlate)</span>
            </h2>
            <CriticalPathToggle
              enabled={showCriticalPath}
              onToggle={setShowCriticalPath}
              criticalEventCount={criticalPathEventIds.length}
            />
          </div>
          <CorrelatedTimeline
            events={timelineEvents}
            height={350}
            criticalPathEventIds={criticalPathEventIds}
            showCriticalPath={showCriticalPath}
          />
        </section>

        <ConnectionThread flamegraphRef={flamegraphRef} timelineRef={timelineRef} />
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
