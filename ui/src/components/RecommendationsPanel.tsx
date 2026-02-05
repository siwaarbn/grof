import type { SessionMetrics } from "../types/comparison";

type Recommendation = {
  severity: "high" | "medium" | "low";
  message: string;
};

function generateRecommendations(metrics: SessionMetrics): Recommendation[] {
  const recs: Recommendation[] = [];

  const gpuIdleRatio =
    metrics.gpuIdleTimeMs / Math.max(metrics.totalTimeMs, 1);

  const memcpyRatio =
    metrics.memcpyTimeMs / Math.max(metrics.totalTimeMs, 1);

  if (gpuIdleRatio > 0.3) {
    recs.push({
      severity: "high",
      message: `CPU bottleneck detected — GPU idle ${(gpuIdleRatio * 100).toFixed(
        1
      )}%`,
    });
  }

  if (memcpyRatio > 0.2) {
    recs.push({
      severity: "medium",
      message: `High memory transfer overhead — ${(memcpyRatio * 100).toFixed(
        1
      )}% of total time`,
    });
  }

  return recs;
}

export default function RecommendationsPanel({
  metrics,
}: {
  metrics: SessionMetrics;
}) {
  const recs = generateRecommendations(metrics);

  if (recs.length === 0) {
    return <p>No major performance issues detected.</p>;
  }

  return (
    <div
      style={{
        background: "#1e1e1e",
        padding: 16,
        borderRadius: 8,
        marginTop: 20,
      }}
    >
      <h3>Recommendations</h3>
      <ul>
        {recs.map((r, i) => (
          <li
            key={i}
            style={{
              color:
                r.severity === "high"
                  ? "#e74c3c"
                  : r.severity === "medium"
                  ? "#f1c40f"
                  : "#2ecc71",
            }}
          >
            {r.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
