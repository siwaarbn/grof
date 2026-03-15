import { api } from "./client";
import type { Session } from "../types/session";
import type { RawSession } from "../types/rawSession";
import type { SessionMetrics } from "../types/comparison";

/**
 * Raw shape returned by FastAPI (/api/v1/sessions) — list endpoint
 */
interface RawSessionListItem {
  id: number;
  name: string;
  start_time: number;   // nanoseconds
  end_time: number | null;
  git_commit_hash?: string | null;
  tags?: unknown;
}

/* ================= ADAPTERS ================= */

function adaptSession(raw: RawSessionListItem): Session {
  const startMs = raw.start_time / 1e6;
  const endMs = raw.end_time ? raw.end_time / 1e6 : null;
  const start = new Date(startMs);
  const end = endMs ? new Date(endMs) : new Date();

  return {
    id: String(raw.id),
    name: raw.name || "unnamed",
    date: start.toLocaleString(),
    duration: Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)),
    status: raw.end_time ? "completed" : "running",
    gpuUsage: 0, // computed separately via fetchSessionMetrics
    cpuUsage: 0, // computed separately via fetchSessionMetrics
  };
}

/**
 * Maps a full RawSession into the SessionMetrics shape used by the UI.
 * - cpu_samples  →  cpuFunctions  (aggregated by function name)
 * - gpu_events   →  gpuKernels + memcpyTimeMs
 */
function adaptSessionMetrics(raw: RawSession): SessionMetrics {
  const sessionDurationMs = (raw.end_time - raw.start_time) / 1e6;

  // ── CPU ──────────────────────────────────────────────────────────────────
  const cpuMap = new Map<string, number>();
  for (const sample of raw.cpu_samples) {
    cpuMap.set(
      sample.function_name,
      (cpuMap.get(sample.function_name) ?? 0) + sample.duration_ms
    );
  }
  const cpuFunctions = Array.from(cpuMap.entries()).map(([name, totalTimeMs]) => ({
    name,
    totalTimeMs,
  }));
  const cpuTotalTimeMs = cpuFunctions.reduce((s, f) => s + f.totalTimeMs, 0);

  // ── GPU ──────────────────────────────────────────────────────────────────
  const kernelMap = new Map<string, { count: number; totalTimeMs: number }>();
  let memcpyTimeMs = 0;

  for (const event of raw.gpu_events) {
    if (event.type === "kernel") {
      const existing = kernelMap.get(event.kernel_name) ?? { count: 0, totalTimeMs: 0 };
      kernelMap.set(event.kernel_name, {
        count: existing.count + 1,
        totalTimeMs: existing.totalTimeMs + event.duration_ms,
      });
    } else {
      memcpyTimeMs += event.duration_ms;
    }
  }

  const gpuKernels = Array.from(kernelMap.entries()).map(([name, stats]) => ({
    name,
    count: stats.count,
    totalTimeMs: stats.totalTimeMs,
    // smEfficiency and dramUtilization remain undefined until backend provides them
  }));

  const gpuTotalTimeMs = gpuKernels.reduce((s, k) => s + k.totalTimeMs, 0) + memcpyTimeMs;
  const gpuIdleTimeMs = Math.max(0, sessionDurationMs - gpuTotalTimeMs);

  return {
    sessionId: raw.id,
    totalTimeMs: sessionDurationMs,
    cpuTotalTimeMs,
    cpuFunctions,
    gpuTotalTimeMs,
    gpuIdleTimeMs,
    gpuKernels,
    memcpyTimeMs,
  };
}

/* ================= API ================= */

/** Fetch session list (Dashboard) */
export async function fetchSessions(): Promise<Session[]> {
  const res = await api.get<RawSessionListItem[]>("/sessions");
  return res.data.map(adaptSession);
}

/** Fetch raw session by ID — used internally by fetchSessionMetrics */
export async function fetchSessionById(id: string): Promise<RawSession> {
  const res = await api.get<RawSession>(`/sessions/${id}`);
  return res.data;
}

/**
 * Fetch full session and derive UI metrics from raw hardware data.
 * This is the primary function for detail pages and comparison views.
 */
export async function fetchSessionMetrics(id: string): Promise<SessionMetrics> {
  const raw = await fetchSessionById(id);
  return adaptSessionMetrics(raw);
}
