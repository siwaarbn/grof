import type { SessionMetrics } from "../types/comparison";

type Recommendation = {
  severity: "high" | "medium" | "low";
  message: string;
  suggestion: string;
};

function generateRecommendations(metrics: SessionMetrics): Recommendation[] {
  const recs: Recommendation[] = [];

  const total = Math.max(metrics.totalTimeMs, 1);

  // Insight 1: CPU Bottleneck — GPU idle > 30% of total time
  const gpuIdleRatio = metrics.gpuIdleTimeMs / total;
  if (gpuIdleRatio > 0.3) {
    recs.push({
      severity: "high",
      message: `CPU Bottleneck Detected: GPU idle ${(gpuIdleRatio * 100).toFixed(1)}% of the time.`,
      suggestion:
        "The CPU is not feeding data to the GPU fast enough. Optimize your data loaders or preprocessing pipeline.",
    });
  }

  // Insight 2: Memory Transfer Overhead > 20% of total time
  const memcpyRatio = metrics.memcpyTimeMs / total;
  if (memcpyRatio > 0.2) {
    recs.push({
      severity: "medium",
      message: `High Memory Overhead: Transfers account for ${(memcpyRatio * 100).toFixed(1)}% of runtime.`,
      suggestion:
        "Consider using pinned memory (page-locked) or overlapping transfers with kernel execution.",
    });
  }

  // Insight 3: Low SM Utilization — average < 40%
  const avgSM =
    metrics.gpuKernels.length > 0
      ? metrics.gpuKernels.reduce((acc, k) => acc + (k.smEfficiency ?? 0), 0) /
        metrics.gpuKernels.length
      : 100;

  if (avgSM < 40 && metrics.gpuTotalTimeMs > 0) {
    recs.push({
      severity: "low",
      message: `Low SM Utilization: Kernels operating at only ${avgSM.toFixed(1)}% capacity.`,
      suggestion:
        "The GPU is undersaturated. Try increasing your batch size or adjusting grid/block dimensions.",
    });
  }

  return recs;
}

const severityColor: Record<"high" | "medium" | "low", string> = {
  high: "#e74c3c",
  medium: "#f1c40f",
  low: "#3498db",
};

const severityLabel: Record<"high" | "medium" | "low", string> = {
  high: "🔴 HIGH",
  medium: "🟡 MEDIUM",
  low: "🔵 LOW",
};

interface Props {
  metrics: SessionMetrics;
  /** Optional label shown in the panel header (e.g. "Session 1") */
  sessionLabel?: string;
}

export default function RecommendationsPanel({ metrics, sessionLabel }: Props) {
  const recs = generateRecommendations(metrics);

  return (
    <div
      style={{
        background: "#1e1e1e",
        padding: "20px",
        borderRadius: "12px",
        color: "white",
        border: "1px solid #333",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          borderBottom: "1px solid #444",
          paddingBottom: "10px",
          fontSize: "15px",
        }}
      >
        💡 Performance Insights
        {sessionLabel && (
          <span style={{ color: "#646cff", marginLeft: 8, fontWeight: 400 }}>
            — {sessionLabel}
          </span>
        )}
      </h3>

      {recs.length === 0 ? (
        <p style={{ color: "#2ecc71", fontSize: "13px" }}>
          ✅ No bottlenecks detected. Model appears well-optimized.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {recs.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "12px",
                borderRadius: "6px",
                backgroundColor: "#2a2a2a",
                borderLeft: `4px solid ${severityColor[r.severity]}`,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: severityColor[r.severity],
                  fontWeight: 700,
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {severityLabel[r.severity]}
              </div>
              <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "13px" }}>
                {r.message}
              </div>
              <div style={{ fontSize: "12px", color: "#bbb" }}>{r.suggestion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
