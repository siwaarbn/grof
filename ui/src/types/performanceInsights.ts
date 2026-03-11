// ui/src/types/performanceInsights.ts

export interface GpuKernelMetric {
  name: string;

  /** Number of kernel invocations */
  count: number;

  /** Total execution time across all calls (ms) */
  totalTimeMs: number;

  /** Optional: average duration per call (ms) */
  durationMs?: number;

  /** Optional: SM utilization percentage */
  smUtilization?: number;

  /** Optional: SM efficiency (0–1 or %) */
  smEfficiency?: number;

  /** Optional: DRAM utilization (%) */
  dramUtilization?: number;
}
