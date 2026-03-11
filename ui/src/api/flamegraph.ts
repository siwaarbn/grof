import { api } from "./client";
import type { FlamegraphNode } from "../types/flamegraph";

export async function fetchFlamegraph(
  sessionId: string
): Promise<FlamegraphNode> {
  const res = await api.get<FlamegraphNode>(
    `/sessions/${sessionId}/flamegraph`
  );
  return res.data;
}
