import { api } from "./client";
import type { Session } from "../types/session";


interface RawSession {
  id: string;
  name: string;
  start_time: string;
  end_time: string | null;
  status: "completed" | "running" | "failed";
  gpu_usage?: number;
  cpu_usage?: number;
}


function adaptSession(raw: RawSession): Session {
  const start = new Date(raw.start_time);
  const end = raw.end_time ? new Date(raw.end_time) : new Date();

  return {
    id: raw.id,
    name: raw.name,
    date: start.toISOString().slice(0, 19).replace("T", " "),
    duration: Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)),
    status: raw.status,
    gpuUsage: raw.gpu_usage ?? 0,
    cpuUsage: raw.cpu_usage ?? 0,
  };
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await api.get<RawSession[]>("/sessions");
  return res.data.map(adaptSession);
}
