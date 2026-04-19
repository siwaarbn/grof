import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Flamegraph from "../components/Flamegraph";

import { fetchFlamegraph } from "../api/flamegraph";
import type { FlamegraphNode } from "../types/flamegraph";

export default function RunDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [flamegraph, setFlamegraph] = useState<FlamegraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetchFlamegraph(id)
      .then((data) => {
        setFlamegraph(data);
      })
      .catch((err) => {
        console.error("❌ Failed to load flamegraph", err);
        setError("Failed to load flamegraph");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Loading session…</h2>
      </div>
    );
  }

  if (error || !id) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>Session not found</h1>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "#646cff",
            border: "1px solid #646cff",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ marginBottom: 10 }}>Session {id}</h1>
        <p style={{ color: "#888", margin: 0 }}>
          Flamegraph visualization
        </p>
      </div>

      {/* Flamegraph */}
      <section>
        <h2 style={{ marginBottom: 15 }}>Flamegraph</h2>

        {flamegraph ? (
          <Flamegraph data={flamegraph} height={600} />
        ) : (
          <p style={{ color: "#888" }}>No flamegraph data available.</p>
        )}
      </section>
    </div>
  );
}
