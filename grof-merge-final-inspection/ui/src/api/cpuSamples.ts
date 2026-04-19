import { api } from "./client";

export interface CpuSample {
  id: number;
  timestamp: number;
  thread_id: number;
  stack_hash: string;
}

export async function fetchCpuSamples(sessionId: number): Promise<CpuSample[]> {
  const res = await api.get(`/sessions/${sessionId}/cpu-samples`);
  return res.data.samples;
}
