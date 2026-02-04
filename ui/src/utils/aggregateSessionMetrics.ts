import type { RawSession } from "../types/rawSession";
import type { SessionMetrics } from "../types/comparison";

export function aggregateSessionMetrics(
  rawSession: RawSession
): SessionMetrics {
  const sessionId = rawSession.id;

  const totalTimeMs = rawSession.end_time - rawSession.start_time;

  /* ================= CPU ================= */

  const cpuFunctionsMap = new Map<string, number>();
  let cpuTotalTimeMs = 0;

  for (const sample of rawSession.cpu_samples) {
    cpuTotalTimeMs += sample.duration_ms;

    cpuFunctionsMap.set(
      sample.function_name,
      (cpuFunctionsMap.get(sample.function_name) ?? 0) +
        sample.duration_ms
    );
  }

  const cpuFunctions = Array.from(cpuFunctionsMap.entries()).map(
    ([name, totalTimeMs]) => ({
      name,
      totalTimeMs,
    })
  );

  /* ================= GPU ================= */

  let gpuTotalTimeMs = 0;
  let memcpyTimeMs = 0;

  const gpuKernelsMap = new Map<
    string,
    { totalTimeMs: number; calls: number }
  >();

  for (const event of rawSession.gpu_events) {
    gpuTotalTimeMs += event.duration_ms;

    if (event.type === "memcpy") {
      memcpyTimeMs += event.duration_ms;
      continue;
    }

    const entry =
      gpuKernelsMap.get(event.kernel_name) ??
      { totalTimeMs: 0, calls: 0 };

    entry.totalTimeMs += event.duration_ms;
    entry.calls += 1;

    gpuKernelsMap.set(event.kernel_name, entry);
  }

  const gpuKernels = Array.from(gpuKernelsMap.entries()).map(
    ([name, data]) => ({
      name,
      totalTimeMs: data.totalTimeMs,
      calls: data.calls,

      // Week 4+ (filled later by T2 / backend)
      smEfficiency: undefined,
      dramUtilization: undefined,
    })
  );

  const gpuIdleTimeMs = totalTimeMs - gpuTotalTimeMs;

  /* ================= RESULT ================= */

  return {
    sessionId,
    totalTimeMs,

    cpuTotalTimeMs,
    cpuFunctions,

    gpuTotalTimeMs,
    gpuIdleTimeMs,
    gpuKernels,

    memcpyTimeMs,
  };
}
