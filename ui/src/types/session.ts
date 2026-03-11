/**
 * Session type for profiling sessions
 * Re-exported from mockSessions for API compatibility
 */

export interface Session {
  id: string;
  name: string;
  date: string;
  duration: number;
  cpuUsage: number;
  gpuUsage: number;
  status: "completed" | "running" | "failed";
}