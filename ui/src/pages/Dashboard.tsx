import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SessionList from "../components/SessionList";
import Flamegraph from "../components/Flamegraph";

import { fetchSessions, fetchSessionMetrics } from "../api/sessions";
import { fetchFlamegraph } from "../api/flamegraph";

import type { Session } from "../types/session";
import type { FlamegraphNode } from "../types/flamegraph";
import { theme } from "../theme";

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);

  const [flamegraph, setFlamegraph] = useState<FlamegraphNode | null>(null);
  const [flamegraphLoading, setFlamegraphLoading] = useState(false);

  const navigate = useNavigate();

  // ---------------- fetch sessions ----------------
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSessions();
        setSessions(data);
        setLoading(false);

        // Fetch per-session metrics in parallel to populate GPU% / CPU%
        const results = await Promise.allSettled(
          data.map((s) => fetchSessionMetrics(s.id))
        );
        setSessions(
          data.map((session, i) => {
            const r = results[i];
            if (r.status !== "fulfilled") return session;
            const m = r.value;
            return {
              ...session,
              gpuUsage:
                m.totalTimeMs > 0
                  ? Math.round((m.gpuTotalTimeMs / m.totalTimeMs) * 100)
                  : 0,
              cpuUsage:
                m.totalTimeMs > 0
                  ? Math.round((m.cpuTotalTimeMs / m.totalTimeMs) * 100)
                  : 0,
            };
          })
        );
      } catch (err: unknown) {
        console.error("❌ fetchSessions failed", err);
        setError(err instanceof Error ? err.message : "Failed to load sessions");
        setLoading(false);
      }
    }
    load();
  }, []);

  // ---------------- session click: toggle + flamegraph preview ----------------
  function toggleSessionSelection(id: string) {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

    setPreviewSessionId(id);
    setFlamegraph(null);
    setFlamegraphLoading(true);

    fetchFlamegraph(id)
      .then((data) => setFlamegraph(data))
      .catch((err: unknown) => {
        console.error("❌ fetchFlamegraph failed", err);
        setFlamegraph(null);
      })
      .finally(() => setFlamegraphLoading(false));
  }

  // ---------------- navigate to correlated detail view ----------------
  function handleViewDetails(id: string) {
    navigate(`/session/${id}/correlated`);
  }

  // ---------------- compare ----------------
  function handleCompare() {
    if (selectedSessionIds.length < 2) return;
    navigate(`/compare?ids=${selectedSessionIds.join(",")}`);
  }

  // ---------------- guards ----------------
  if (loading) return <div style={{ padding: 20 }}>Loading sessions…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;

  // ---------------- render ----------------
  return (
    <div style={{ minHeight: "100vh", background: theme.bgApp, color: theme.textPrimary, padding: "40px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>GROF Dashboard</h1>
            <p style={{ margin: 0, color: theme.textSecondary, fontSize: 15 }}>
              Manage profiling sessions and launch traces
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ color: theme.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Active Sessions</span>
            <div style={{ fontSize: 24, fontWeight: 600, color: theme.textPrimary }}>{sessions.length}</div>
          </div>
        </div>

        {/* Action Panel */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleCompare}
            disabled={selectedSessionIds.length < 2}
            style={{
              padding: "10px 20px",
              background: selectedSessionIds.length >= 2 ? theme.accent : theme.bgSurfaceHighlight,
              color: selectedSessionIds.length >= 2 ? "#fff" : theme.textSecondary,
              border: `1px solid ${selectedSessionIds.length >= 2 ? theme.accent : theme.border}`,
              borderRadius: "8px",
              cursor: selectedSessionIds.length >= 2 ? "pointer" : "not-allowed",
              fontWeight: "600",
              fontSize: 14,
              transition: "all 0.2s"
            }}
          >
            ⚖️ A/B Compare ({selectedSessionIds.length} selected)
          </button>
          {selectedSessionIds.length < 2 && (
            <span style={{ color: theme.textSecondary, fontSize: 13 }}>
              ← Select 2 sessions from the list below to run an A/B comparison
            </span>
          )}

          {previewSessionId && (
            <button
              onClick={() => handleViewDetails(previewSessionId)}
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: theme.accent,
                border: `1px solid ${theme.accent}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: 14,
                transition: "all 0.2s"
              }}
            >
              🔍 View Details →
            </button>
          )}
      </div>

        <SessionList
          sessions={sessions}
          selectedSessionIds={selectedSessionIds}
          onToggleSelect={toggleSessionSelection}
        />

        <div style={{ marginTop: 40, borderTop: `1px solid ${theme.border}`, paddingTop: 32 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 600 }}>Flamegraph Preview</h2>

          <div style={{ 
            background: theme.bgSurface, 
            border: `1px solid ${theme.border}`, 
            borderRadius: theme.radius, 
            padding: "24px",
            boxShadow: theme.shadow
          }}>
            {flamegraphLoading && (
              <div style={{ padding: "60px", textAlign: "center", color: theme.textSecondary, fontSize: 14 }}>
                <div style={{ display: "inline-block", width: 24, height: 24, border: `2px solid ${theme.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 12 }} />
                <div>Loading trace layout...</div>
              </div>
            )}

            {!flamegraphLoading && flamegraph && (
              <div style={{ background: theme.bgApp, padding: 4, borderRadius: 8 }}>
                <Flamegraph data={flamegraph} height={400} />
              </div>
            )}

            {!flamegraphLoading && !flamegraph && (
              <div style={{ 
                padding: "80px 40px", 
                textAlign: "center", 
                color: theme.textSecondary,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12
              }}>
                <div style={{ fontSize: 32, opacity: 0.5 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>No Trace Selected</div>
                <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.5 }}>Select a running/completed session from the list above to preview its CPU profile flamegraph here.</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
