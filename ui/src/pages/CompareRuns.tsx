import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { fetchSessionById } from "../api/sessions";
import { aggregateSessionMetrics } from "../utils/aggregateSessionMetrics";

import Flamegraph from "../components/Flamegraph";
import FlamegraphLegend from "../components/FlamegraphLegend";
import { mockFlamegraphData } from "../data/mockFlamegraphData";

import type { SessionMetrics } from "../types/comparison";

type CompareItem = {
  sessionId: string;
  metrics: SessionMetrics;
};

export default function CompareRuns() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const idsParam = searchParams.get("ids") ?? "";
  const sessionIds = idsParam.split(",").filter(Boolean);

  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (sessionIds.length < 2) {
        setError("Select at least two sessions to compare.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const results = await Promise.all(
          sessionIds.map(async (id) => {
            console.log("Fetching session with id:", id);
            const raw = await fetchSessionById(id);

            const metrics = aggregateSessionMetrics(raw);

            return { sessionId: id, metrics };
          })
        );

        if (!cancelled) {
          setItems(results);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Failed to load comparison data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [idsParam]); // ✅ correct dependency

  if (loading) {
    return <p style={{ padding: 20 }}>Loading comparison…</p>;
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate("/")}>← Back to Dashboard</button>

      <h1 style={{ margin: "20px 0" }}>Compare Runs</h1>

      {/* ================= METRICS TABLE ================= */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 40,
        }}
      >
        <thead>
          <tr>
            <th>Metric</th>
            {items.map((i) => (
              <th key={i.sessionId}>{i.sessionId}</th>
            ))}
            <th>Δ</th>
          </tr>
        </thead>
        <tbody>
          <MetricRow
            label="Total Time (ms)"
            values={items.map((i) => i.metrics.totalTimeMs)}
            lowerIsBetter
          />
          <MetricRow
            label="CPU Time (ms)"
            values={items.map((i) => i.metrics.cpuTotalTimeMs)}
            lowerIsBetter
          />
          <MetricRow
            label="GPU Time (ms)"
            values={items.map((i) => i.metrics.gpuTotalTimeMs)}
            lowerIsBetter
          />
        </tbody>
      </table>

      {/* ================= FLAMEGRAPHS ================= */}
      <h2>Flamegraphs (Side-by-Side)</h2>
      <FlamegraphLegend />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          gap: 20,
        }}
      >
        {items.map((i) => (
          <div key={i.sessionId}>
            <h3 style={{ textAlign: "center" }}>{i.sessionId}</h3>
            <Flamegraph data={mockFlamegraphData} height={400} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= METRIC ROW ================= */

function MetricRow({
  label,
  values,
  lowerIsBetter,
}: {
  label: string;
  values: number[];
  lowerIsBetter: boolean;
}) {
  const a = values[0];
  const b = values[1];
  const delta = b - a;
  const percent = a !== 0 ? (delta / a) * 100 : 0;

  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const color = improved ? "#2ecc71" : "#e74c3c";

  return (
    <tr>
      <td>{label}</td>
      <td>{Math.round(a)}</td>
      <td>{Math.round(b)}</td>
      <td style={{ color, fontWeight: 600 }}>
        {delta > 0 ? "+" : ""}
        {Math.round(delta)} ({percent.toFixed(1)}%)
      </td>
    </tr>
  );
}
