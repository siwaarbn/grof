import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

      <SessionList
        sessions={sessions}
        selectedSessionIds={selectedSessionIds}
        onToggleSelect={toggleSession}
      />

      <button
        style={{ marginTop: 20 }}
        disabled={selectedSessionIds.length < 2}
        onClick={handleCompare}
      >
        Compare selected
      </button>
    </div>
  );
}
