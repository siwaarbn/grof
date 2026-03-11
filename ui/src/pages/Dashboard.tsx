import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

<<<<<<< HEAD
import { fetchSessions } from "../api/sessions";
import SessionList from "../components/SessionList";
import type { Session } from "../types/session";

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  function toggleSession(id: number) {
    setSelectedSessionIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function handleCompare() {
    if (selectedSessionIds.length < 2) return;
    navigate(`/compare?ids=${selectedSessionIds.join(",")}`);
    const query = selectedSessionIds.join(",");
    navigate(`/compare?ids=${query}`);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Sessions</h1>
=======
import SessionList from "../components/SessionList";
import Flamegraph from "../components/Flamegraph";

import { fetchSessions } from "../api/sessions";
import { fetchFlamegraph } from "../api/flamegraph";

import type { Session } from "../types/session";
import type { FlamegraphNode } from "../types/flamegraph";

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
    fetchSessions()
      .then((data) => setSessions(data))
      .catch((err: unknown) => {
        console.error("❌ fetchSessions failed", err);
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      })
      .finally(() => setLoading(false));
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
    <div style={{ padding: 20 }}>
      <h1>GROF Dashboard</h1>
      <p style={{ color: "#888" }}>Sessions loaded: {sessions.length}</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={handleCompare}
          disabled={selectedSessionIds.length < 2}
          style={{
            padding: "8px 18px",
            background: selectedSessionIds.length >= 2 ? "#646cff" : "#333",
            color: selectedSessionIds.length >= 2 ? "#fff" : "#666",
            border: "none",
            borderRadius: "6px",
            cursor: selectedSessionIds.length >= 2 ? "pointer" : "not-allowed",
            fontWeight: "600",
          }}
        >
          ⚖️ Compare ({selectedSessionIds.length})
        </button>

        {previewSessionId && (
          <button
            onClick={() => handleViewDetails(previewSessionId)}
            style={{
              padding: "8px 18px",
              background: "transparent",
              color: "#646cff",
              border: "1px solid #646cff",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            🔍 View Details →
          </button>
        )}
      </div>
>>>>>>> frontend

      <SessionList
        sessions={sessions}
        selectedSessionIds={selectedSessionIds}
<<<<<<< HEAD
        onToggleSelect={toggleSession}
      />

      <button
        style={{ marginTop: 20 }}
        disabled={selectedSessionIds.length < 2}
        onClick={handleCompare}
      >
        Compare selected
      </button>
=======
        onToggleSelect={toggleSessionSelection}
      />

      <hr style={{ margin: "30px 0", borderColor: "#333" }} />

      <h2>Flamegraph Preview</h2>

      {flamegraphLoading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#888", background: "#1e1e1e", borderRadius: "8px" }}>
          Loading flamegraph…
        </div>
      )}

      {!flamegraphLoading && flamegraph && (
        <Flamegraph data={flamegraph} height={600} />
      )}

      {!flamegraphLoading && !flamegraph && (
        <p style={{ color: "#888", padding: "40px", textAlign: "center", background: "#1e1e1e", borderRadius: "8px" }}>
          ☝️ Click a session to preview its flamegraph
        </p>
      )}
>>>>>>> frontend
    </div>
  );
}
