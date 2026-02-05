export type RecommendationSeverity = "high" | "medium" | "low";

export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  score: number; // used for ranking
}
