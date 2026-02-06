import type { SessionMetrics } from "../types/comparison";
import type { PerformanceRecommendation } from "../types/performanceInsights";

export function generateRecommendations(
  metrics: SessionMetrics
): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = [];

  /* ================= CPU BOTTLENECK ================= */
  const gpuIdleRatio = metrics.gpuIdleTimeMs / metrics.totalTimeMs;

  if (gpuIdleRatio > 0.3) {
    recommendations.push({
      id: "cpu-bottleneck",
      title: "CPU Bottleneck Detected",
      description:
        "GPU is idle for a significant portion of execution time. CPU may not be feeding the GPU fast enough.",
      severity: "high",
      score: gpuIdleRatio,
    });
  }

  /* ================= MEMCPY BOTTLENECK ================= */
  const memcpyRatio = metrics.memcpyTimeMs / metrics.totalTimeMs;

  if (memcpyRatio > 0.2) {
    recommendations.push({
      id: "memcpy-heavy",
      title: "Heavy Memory Transfers",
      description:
        "Memory transfer time is high. Consider batching data or using pinned memory.",
      severity: "medium",
      score: memcpyRatio,
    });
  }

  /* ================= KERNEL ANALYSIS ================= */
  for (const kernel of metrics.gpuKernels) {
    if (
      kernel.smEfficiency !== undefined &&
      kernel.smEfficiency < 50
    ) {
      recommendations.push({
        id: `low-sm-${kernel.name}`,
        title: `Low SM Utilization: ${kernel.name}`,
        description:
          "Kernel shows low SM utilization. Try increasing batch size or grid dimensions.",
        severity: "medium",
        score: 50 - kernel.smEfficiency,
      });
    }
  }

  /* ================= SORT BY IMPACT ================= */
  return recommendations.sort((a, b) => b.score - a.score);
}
