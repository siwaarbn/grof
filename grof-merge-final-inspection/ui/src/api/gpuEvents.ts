import { api } from "./client";

export interface GpuEvent {
  start_time: number;
  end_time: number;
  name: string;
  type: string;
}

export async function fetchGpuEventsBySessionId(
  sessionId: string
): Promise<GpuEvent[]> {
  const res = await api.get(`/gpu-events/${sessionId}`);
  return res.data;
}
