import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { fetchSessionById } from "../api/sessions";
import { aggregateSessionMetrics } from "../utils/aggregateSessionMetrics";
import { exportElementToPdf } from "../utils/exportPdf";

import type { SessionMetrics } from "../types/comparison";
import type { RawSession } from "../types/rawSession";

import KernelAnalysisTable from "../components/KernelAnalysisTable";
import RecommendationsPanel from "../components/RecommendationsPanel";

/* ================= TYPES ================= */

type SessionComparison = {
  sessionId: number;
  session: RawSession;
  metrics: SessionMetrics;
};

/* ================= HELPERS ================= */

function toNumericSessionId(id: string): number | null {
  const match = id.match(/\d+$/);
  return match ? Number(match[0]) : null;
}

/* ================= COMPONENT ================= */

export default function CompareRuns() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const sessionIds = useMemo(() => {
    const raw = searchParams.get("ids");
    if (!raw) return [];

    return raw
      .split(",")
      .map(toNumericSessionId)
      .filter((id): id is number => id !== null);
  }, [searchParams]);

  const [data, setData] = useState<SessionComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (sessionIds.length < 2) {
        setData([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          sessionIds.map(async (id) => {
            const session = await fetchSessionById(String(id));
            const metrics = aggregateSessionMetrics(session);

            return {
              sessionId: id,
              session,
              metrics,
            };
          })
        );

        if (!cancelled) setData(results);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load comparison data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionIds]);

  /* ================= RENDER ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading comparison…</p>;

  if (error)
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>
    );

  if (data.length < 2)
    return (
      <div style={{ padding: 20 }}>
        <p>Select at least two sessions.</p>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>
    );

  return (
    <div style={{ display: "flex" }}>
      {/* ===== MAIN REPORT CONTENT ===== */}
      <div ref={reportRef} style={{ flex: 1, padding: 20 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate("/")}>← Back</button>

          <button
            onClick={() => {
              if (reportRef.current) {
                exportElementToPdf(
                  reportRef.current,
                  `grof-performance-report-session-${data[0].sessionId}.pdf`
                );
              }
            }}
            style={{
              padding: "8px 16px",
              background: "#2ecc71",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Export PDF Report
          </button>
        </div>

        <h1>Compare Runs</h1>

        {/* ===== METRICS TABLE ===== */}
        <table style={{ width: "100%", marginBottom: 30 }}>
          <thead>
            <tr>
              <th>Metric</th>
              {data.map((d) => (
                <th key={d.sessionId}>Session {d.sessionId}</th>
              ))}
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            <MetricRowWithDelta
              label="Total GPU Time (ms)"
              values={data.map((d) => d.metrics.gpuTotalTimeMs)}
              lowerIsBetter
            />
            <MetricRowWithDelta
              label="Memcpy Time (ms)"
              values={data.map((d) => d.metrics.memcpyTimeMs)}
              lowerIsBetter
            />
            <MetricRowWithDelta
              label="# GPU Kernels"
              values={data.map((d) => d.metrics.gpuKernels.length)}
              lowerIsBetter={false}
            />
          </tbody>
        </table>

        {/* ===== KERNEL ANALYSIS ===== */}
        {data.map((d) => (
          <KernelAnalysisTable
            key={d.sessionId}
            metrics={d.metrics}
          />
        ))}
      </div>

      {/* ===== RECOMMENDATIONS SIDE PANEL ===== */}
      <RecommendationsPanel metrics={data[0].metrics} />
    </div>
  );
}

/* ================= HELPER ================= */

function MetricRowWithDelta({
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

  return (
    <tr>
      <td>{label}</td>
      <td>{Math.round(a)}</td>
      <td>{Math.round(b)}</td>
      <td style={{ color: improved ? "green" : "red" }}>
        {delta > 0 ? "+" : ""}
        {delta.toFixed(1)} ({percent.toFixed(1)}%)
      </td>
    </tr>
  );
}
