

export interface CpuFunctionMetric {
  name: string
  totalTimeMs: number
}

export interface GpuKernelMetric {
  name: string
  totalTimeMs: number
  count: number
}

export interface SessionMetrics {
  sessionId: string

  // Global
  totalTimeMs: number

  // CPU
  cpuTotalTimeMs: number
  cpuFunctions: CpuFunctionMetric[]

  // GPU
  gpuTotalTimeMs: number
  gpuIdleTimeMs: number
  gpuKernels: GpuKernelMetric[]

  // Memory
  memcpyTimeMs: number
}
