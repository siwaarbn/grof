

export interface CpuFunctionMetric {
  name: string
  totalTimeMs: number
}

export interface GpuKernelMetric {
  name: string;

  // number of kernel launches
  count: number;

  // accumulated execution time
  totalTimeMs: number;

  // optional (future backend metrics)
  smEfficiency?: number;
  dramUtilization?: number;
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
