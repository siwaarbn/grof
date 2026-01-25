/**
 * Session type for profiling sessions
 * Re-exported from mockSessions for API compatibility
 */

export interface Session {
    id: number;
    name: string;
    date?: string;
    start_time?: string;
    duration?: number;
    status?: "completed" | "running" | "failed";
    gpuUsage?: number;
    cpuUsage?: number;
}
