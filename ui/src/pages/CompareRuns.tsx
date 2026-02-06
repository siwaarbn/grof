import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { RawSession } from "../types/rawSession";

/* ===== API ===== */
import { fetchFlamegraph } from "../api/flamegraph";
import { fetchCriticalPath } from "../api/criticalPath";

/* ===== UTILS ===== */
import { aggregateSessionMetrics } from "../utils/aggregateSessionMetrics";
import { exportElementToPdf } from "../utils/exportPdf";

/* ===== TYPES ===== */
import type { SessionMetrics } from "../types/comparison";

/* ===== COMPONENTS ===== */
import KernelAnalysisTable from "../components/KernelAnalysisTable";
import RecommendationsPanel from "../components/RecommendationsPanel";

/* ================= TYPES ================= */

type SessionComparison = {
  sessionId: number;
  metrics: SessionMetrics;
};

/* ================= HELPERS ================= */

function parseSessionIds(param: string | null): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map(Number)
    .filter((x) => Number.isFinite(x));
}

/* ================= COMPONENT ================= */

export default function CompareRuns() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const sessionIds = useMemo(
    () => parseSessionIds(searchParams.get("ids")),
    [searchParams]
  );

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
            const [flamegraph, criticalPath] = await Promise.all([
              fetchFlamegraph(String(id)),
              fetchCriticalPath(String(id)),
            ]);

           
            const metricsInput = {
              flamegraph,
              criticalPath,
              cpu_samples: [], 
              gpu_events: [], 
            };

            const metrics = aggregateSessionMetrics(
              metricsInput as unknown as RawSession
            );

            return {
              sessionId: id,
              metrics,
            };
          })
        );

        if (!cancelled) setData(results);
      } catch (e) {
        console.error(e);
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

  if (loading) {
    return <div style={{ padding: 20 }}>Loading comparison…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div style={{ padding: 20 }}>
        <p>Select at least two sessions.</p>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex" }}>
      <div ref={reportRef} style={{ flex: 1, padding: 20 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate("/")}>← Back</button>

          <button
            onClick={() => {
              if (reportRef.current) {
                exportElementToPdf(
                  reportRef.current,
                  `grof-performance-report-${data
                    .map((d) => d.sessionId)
                    .join("-")}.pdf`
                );
              }
            }}
          >
            Export PDF Report
          </button>
        </div>

        <h1>Compare Runs</h1>

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
          </tbody>
        </table>

        {data.map((d) => (
          <div key={d.sessionId}>
            <h3>Session {d.sessionId}</h3>
            <KernelAnalysisTable kernels={d.metrics.gpuKernels} />
          </div>
        ))}
      </div>

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
  const a = values[0] ?? 0;
  const b = values[1] ?? 0;

  const delta = b - a;
  const percent = a !== 0 ? (delta / a) * 100 : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;

  return (
    <tr>
      <td>{label}</td>
      <td>{Math.round(a)}</td>
      <td>{Math.round(b)}</td>
      <td style={{ color: improved ? "green" : "red" }}>
        {delta.toFixed(1)} ({percent.toFixed(1)}%)
      </td>
    </tr>
  );
}
