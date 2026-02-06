import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SessionList from "../components/SessionList";
import Flamegraph from "../components/Flamegraph";

import { fetchSessions } from "../api/sessions";
import { fetchFlamegraph } from "../api/flamegraph";

import type { Session } from "../types/session";
import type { FlamegraphNode } from "../types/flamegraph";

export default function Dashboard() {
  // ---------------- state ----------------
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const [flamegraph, setFlamegraph] =
    useState<FlamegraphNode | null>(null);
  const [flamegraphLoading, setFlamegraphLoading] =
    useState(false);

  const navigate = useNavigate();

  // ---------------- fetch sessions ----------------
  useEffect(() => {
    fetchSessions()
      .then((data) => {
        setSessions(data);
      })
      .catch((err: unknown) => {
        console.error("❌ fetchSessions failed", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load sessions");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ---------------- session click ----------------
  function toggleSessionSelection(id: string) {
    // selection logic (unchanged)
    setSelectedSessionIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );

    // flamegraph fetch
    setFlamegraph(null);
    setFlamegraphLoading(true);

    fetchFlamegraph(id)
      .then((data) => {
        setFlamegraph(data);
      })
      .catch((err: unknown) => {
        console.error("❌ fetchFlamegraph failed", err);
        setFlamegraph(null);
      })
      .finally(() => {
        setFlamegraphLoading(false);
      });
  }

  // ---------------- compare ----------------
  function handleCompare() {
    if (selectedSessionIds.length < 2) return;
    navigate(`/compare?ids=${selectedSessionIds.join(",")}`);
  }

  // ---------------- guards ----------------
  if (loading) {
    return <div style={{ padding: 20 }}>Loading sessions…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        {error}
      </div>
    );
  }

  // ---------------- render ----------------
  return (
    <div style={{ padding: 20 }}>
      <h1>GROF Dashboard</h1>

      <p>Sessions loaded: {sessions.length}</p>

      <button
        onClick={handleCompare}
        disabled={selectedSessionIds.length < 2}
      >
        Compare ({selectedSessionIds.length})
      </button>

      <SessionList
        sessions={sessions}
        selectedSessionIds={selectedSessionIds}
        onToggleSelect={toggleSessionSelection}
      />

      <hr style={{ margin: "30px 0" }} />

      <h2>Flamegraph</h2>

      {flamegraphLoading && (
        <p>Loading flamegraph…</p>
      )}

      {!flamegraphLoading && flamegraph && (
        <Flamegraph data={flamegraph} height={600} />
      )}

      {!flamegraphLoading && !flamegraph && (
        <p style={{ color: "#888" }}>
          Click a session to load flamegraph
        </p>
      )}
    </div>
  );
}
