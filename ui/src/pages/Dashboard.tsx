import { useState } from "react";
import { useNavigate } from "react-router-dom";

import SessionList from "../components/SessionList";
import CpuSampleList from "../components/CpuSampleList";
import GpuEventList from "../components/GpuEventList";

import Flamegraph from "../components/Flamegraph";
import FlamegraphLegend from "../components/FlamegraphLegend";
import Timeline from "../components/Timeline";

import { mockFlamegraphData } from "../data/mockFlamegraphData";
import { mockGpuEvents } from "../data/mockGpuEvents";
import { mockSessions } from "../data/mockSessions";

export default function Dashboard() {
  // Week 3: multi-session selection state
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const navigate = useNavigate();

  function toggleSessionSelection(sessionId: string) {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  }

  function handleCompare() {
    if (selectedSessionIds.length < 2) return;

    const query = selectedSessionIds.join(",");
    navigate(`/compare?ids=${query}`);
  }

  return (
    <div
      style={{
        padding: "20px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginBottom: "10px" }}>GROF Dashboard</h1>

      {/* Selection feedback */}
      <p style={{ color: "#888", marginBottom: "10px" }}>
        Selected sessions: {selectedSessionIds.length}
      </p>

      {/* Compare button */}
      <button
        onClick={handleCompare}
        disabled={selectedSessionIds.length < 2}
        style={{
          marginBottom: "30px",
          padding: "10px 18px",
          borderRadius: "8px",
          border: "none",
          cursor:
            selectedSessionIds.length < 2 ? "not-allowed" : "pointer",
          background:
            selectedSessionIds.length < 2 ? "#555" : "#646cff",
          color: "#fff",
          fontWeight: "600",
          opacity: selectedSessionIds.length < 2 ? 0.6 : 1,
        }}
      >
        Compare ({selectedSessionIds.length})
      </button>

      <div style={{ display: "grid", gap: "30px", width: "100%" }}>
        {/* Session list with selection */}
        <SessionList
          sessions={mockSessions}
          selectedSessionIds={selectedSessionIds}
          onToggleSelect={toggleSessionSelection}
        />

        {/* Existing components */}
        <CpuSampleList />
        <GpuEventList />

        <section>
          <h2 style={{ marginBottom: "15px" }}>GPU Timeline</h2>
          <Timeline events={mockGpuEvents} height={400} />
        </section>

        <section>
          <h2 style={{ marginBottom: "15px" }}>Flamegraph</h2>
          <FlamegraphLegend />
          <Flamegraph data={mockFlamegraphData} height={600} />
        </section>
      </div>
    </div>
  );
}
