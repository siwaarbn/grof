import { api } from "./client";
import type { Session } from "../types/session";

/**
 * Raw shape returned by FastAPI (/api/v1/sessions)
 */
interface RawSession {
  id: number;
  name: string;
  start_time: number; // nanoseconds
  end_time: number | null; // nanoseconds | null
  git_commit_hash?: string | null;
  tags?: unknown;
}

function adaptSession(raw: RawSession): Session {
  const startMs = raw.start_time / 1e6;
  const endMs = raw.end_time ? raw.end_time / 1e6 : null;

  const start = new Date(startMs);
  const end = endMs ? new Date(endMs) : new Date();

  return {
    id: String(raw.id),
    name: raw.name ?? "unnamed",
    date: start.toLocaleString(),
    duration: Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / 1000)
    ),
    status: raw.end_time ? "completed" : "running",
    gpuUsage: 0,
    cpuUsage: 0,
  };
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await api.get<RawSession[]>("/sessions");
  return res.data.map(adaptSession);
}
