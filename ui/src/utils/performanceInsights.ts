import type { SessionMetrics } from "../types/comparison";
import type { PerformanceInsight } from "../types/insights";

export function analyzePerformance(
  metrics: SessionMetrics
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  const totalTime = metrics.totalTimeMs;

  // CPU bottleneck
  if (metrics.gpuIdleTimeMs / totalTime > 0.3) {
    insights.push({
      id: "cpu-bottleneck",
      title: "CPU Bottleneck Detected",
      description:
        "GPU spends significant time idle. CPU may not be feeding work fast enough.",
      severity: "warning",
      score: 80,
    });
  }

  // Memory transfer bottleneck
  if (metrics.memcpyTimeMs / totalTime > 0.2) {
    insights.push({
      id: "memcpy-bottleneck",
      title: "Optimize Data Transfers",
      description:
        "High memory transfer overhead detected. Consider batching or reducing transfers.",
      severity: "warning",
      score: 70,
    });
  }

  return insights;
}
