import type { SessionMetrics } from "../types/comparison";

type Recommendation = {
  severity: "high" | "medium" | "low";
  message: string;
  suggestion: string;
};

function generateRecommendations(metrics: SessionMetrics): Recommendation[] {
  const recs: Recommendation[] = [];

  // Calculation 1: CPU Bottleneck (GPU Idle Time vs Total Time)
  const gpuIdleRatio = metrics.gpuIdleTimeMs / Math.max(metrics.totalTimeMs, 1);
  
  // Calculation 2: Memory Transfer Overhead
  const memcpyRatio = metrics.memcpyTimeMs / Math.max(metrics.totalTimeMs, 1);

  // Calculation 3: Average SM Utilization across all kernels
  const avgSM = metrics.gpuKernels.length > 0
    ? metrics.gpuKernels.reduce((acc, k) => acc + (k.smEfficiency || 0), 0) / metrics.gpuKernels.length
    : 100;

  // --- Insight 1: CPU Bottleneck Detection ---
  if (gpuIdleRatio > 0.3) {
    recs.push({
      severity: "high",
      message: `CPU Bottleneck Detected: GPU is idle ${(gpuIdleRatio * 100).toFixed(1)}% of the time.`,
      suggestion: "The CPU is not feeding data to the GPU fast enough. Optimize your data loaders or preprocessing pipeline."
    });
  }

  // --- Insight 2: Memory Transfer Bottleneck ---
  if (memcpyRatio > 0.2) {
    recs.push({
      severity: "medium",
      message: `High Memory Overhead: Transfers account for ${(memcpyRatio * 100).toFixed(1)}% of runtime.`,
      suggestion: "Consider using pinned memory (page-locked) or overlapping transfers with kernel execution."
    });
  }

  // --- Insight 3: Kernel Optimization (SM Utilization) ---
  if (avgSM < 40 && metrics.gpuTotalTimeMs > 0) {
    recs.push({
      severity: "low",
      message: `Low SM Utilization: Kernels are operating at only ${avgSM.toFixed(1)}% capacity.`,
      suggestion: "The GPU is undersaturated. Try increasing your batch size or adjusting grid/block dimensions."
    });
  }

  return recs;
}

export default function RecommendationsPanel({ metrics }: { metrics: SessionMetrics }) {
  const recs = generateRecommendations(metrics);

  return (
    <div style={{
      background: "#1e1e1e",
      padding: "20px",
      borderRadius: "12px",
      color: "white",
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      border: "1px solid #333"
    }}>
      <h3 style={{ marginTop: 0, borderBottom: "1px solid #444", paddingBottom: "10px" }}>
         Performance Insights
      </h3>
      
      {recs.length === 0 ? (
        <p style={{ color: "#2ecc71" }}> model is well-optimized! No bottlenecks detected.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {recs.map((r, i) => (
            <div key={i} style={{
              padding: "12px",
              borderRadius: "6px",
              backgroundColor: "#2a2a2a",
              borderLeft: `4px solid ${
                r.severity === "high" ? "#e74c3c" : r.severity === "medium" ? "#f1c40f" : "#3498db"
              }`
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{r.message}</div>
              <div style={{ fontSize: "0.9rem", color: "#ccc" }}>{r.suggestion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}