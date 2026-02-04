export type InsightSeverity = "info" | "warning" | "critical";

export interface PerformanceInsight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  score: number; // for ranking
}
