import type { GpuKernelMetric, CpuFunctionMetric } from "../types/comparison";
import type { CorrelatedGpuEvent } from "../types/correlation";

export interface FlamegraphTreeNode {
  id: string;
  name: string;
  value: number;
  color?: string;
  children: FlamegraphTreeNode[];
}

/**
 * Builds a d3-flame-graph compatible tree from a flat list of CPU functions.
 * Functions are sorted by total time descending so hottest paths appear first.
 */
export function buildFlamegraphData(
  cpuFunctions: CpuFunctionMetric[],
  totalTimeMs: number
): FlamegraphTreeNode {
  const sorted = [...cpuFunctions].sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  return {
    id: "root",
    name: "root",
    value: totalTimeMs || 1,
    children: sorted.map((fn, idx) => ({
      id: `root-${idx}`,
      name: fn.name,
      value: fn.totalTimeMs,
      children: [],
    })),
  };
}

/**
 * Builds CorrelatedTimeline events from aggregated GPU kernel metrics.
 * Assigns synthetic sequential start times (real timestamps come from backend in future).
 */
export function buildTimelineEvents(
  gpuKernels: GpuKernelMetric[],
  memcpyTimeMs: number
): CorrelatedGpuEvent[] {
  const events: CorrelatedGpuEvent[] = [];
  let cursor = 0;
  let idx = 0;

  for (const kernel of gpuKernels) {
    const avgDuration = kernel.totalTimeMs / kernel.count;
    for (let i = 0; i < kernel.count; i++) {
      events.push({
        id: `gpu-${idx++}`,
        name: kernel.name,
        type: kernel.name.toLowerCase().includes("memcpy") ? "Memory" : "Kernel",
        startTime: cursor,
        endTime: cursor + avgDuration,
        stream: 1,
        relatedFlamegraphNodes: [],
      });
      cursor += avgDuration;
    }
  }

  if (memcpyTimeMs > 0) {
    events.push({
      id: `gpu-${idx++}`,
      name: "memcpy",
      type: "Memory",
      startTime: cursor,
      endTime: cursor + memcpyTimeMs,
      stream: 2,
      relatedFlamegraphNodes: [],
    });
  }

  return events;
}
