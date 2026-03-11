/**
 * CorrelatedRunDetails - Integrated session details with CPU-GPU Correlation
 * Shows real session metadata from API, with correlated flamegraph + GPU timeline.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CorrelationProvider, useCorrelation } from "../context/CorrelationContext";
import CorrelatedFlamegraph from "../components/CorrelatedFlamegraph";
import CorrelatedTimeline from "../components/CorrelatedTimeline";
import ConnectionThread from "../components/ConnectionThread";
import FlamegraphLegend from "../components/FlamegraphLegend";
import CriticalPathInsight from "../components/CriticalPathInsight";
import CriticalPathToggle from "../components/CriticalPathToggle";
import { correlatedFlamegraphData } from "../data/correlatedFlamegraphData";
import { correlatedGpuEvents } from "../data/correlatedGpuEvents";
import { mockCriticalPath, mockCriticalPathInsight, getCriticalPathEventIds } from "../data/mockCriticalPath";
import { fetchSessions } from "../api/sessions";
import type { Session } from "../types/session";

function CorrelatedRunDetailsInner() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const flamegraphRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const { state, clearSelection } = useCorrelation();
    const { selection } = state;

    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const criticalPathEventIds = getCriticalPathEventIds();

    // Fetch real session metadata from API instead of relying on mock IDs
    const [session, setSession] = useState<Session | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetchSessions()
            .then((sessions) => {
                const found = sessions.find((s) => s.id === id);
                setSession(found ?? null);
            })
            .catch(() => setSession(null))
            .finally(() => setSessionLoading(false));
    }, [id]);

    if (sessionLoading) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                Loading session…
            </div>
        );
    }

    // Build a display object — use real data if found, otherwise show id-based placeholder
    const displaySession = session ?? {
        id: id ?? "?",
        name: `Session ${id}`,
        date: "—",
        duration: 0,
        status: "running" as const,
        gpuUsage: 0,
        cpuUsage: 0,
    };

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
                        <h1 style={{ marginBottom: "10px" }}>{displaySession.name}</h1>
                        <p style={{ color: "#888", margin: 0 }}>
                            Session ID: <code>{displaySession.id}</code> | Date: {displaySession.date}
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

            {/* Session Info Cards */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginBottom: "30px",
            }}>
                {[
                    {
                        label: "Duration",
                        value: displaySession.duration > 0
                            ? `${Math.floor(displaySession.duration / 60)}m ${displaySession.duration % 60}s`
                            : "—",
                        color: "#fff"
                    },
                    { label: "GPU Usage", value: `${displaySession.gpuUsage}%`, color: "#9b59b6" },
                    { label: "CPU Usage", value: `${displaySession.cpuUsage}%`, color: "#3498db" },
                    {
                        label: "Status",
                        value: displaySession.status.toUpperCase(),
                        color: displaySession.status === "completed" ? "#2ecc71"
                            : displaySession.status === "failed" ? "#e74c3c" : "#3498db"
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

            {/* Critical Path Insight Panel */}
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
                    <CorrelatedFlamegraph data={correlatedFlamegraphData} height={500} />
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
                        events={correlatedGpuEvents}
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
