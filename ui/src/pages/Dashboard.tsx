import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SessionList from "../components/SessionList";
import { fetchSessions } from "../api/sessions";
import type { Session } from "../types/session";

export default function Dashboard() {
  console.log("✅ Dashboard render start");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("➡️ useEffect running");

    fetchSessions()
      .then((data) => {
        console.log("✅ sessions received", data);
        setSessions(data);
      })
      .catch((err) => {
        console.error("❌ fetchSessions failed", err);
        setError("Failed to load sessions");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function toggleSessionSelection(id: string) {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleCompare() {
    if (selectedSessionIds.length < 2) return;
    navigate(`/compare?ids=${selectedSessionIds.join(",")}`);
  }

  // 🛑 HARD GUARDS — NOTHING CAN CRASH BELOW
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
    </div>
  );
}
