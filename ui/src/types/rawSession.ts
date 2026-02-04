// src/types/rawSession.ts

export interface CpuSample {
  function_name: string;
  duration_ms: number;
}

export interface GpuKernelEvent {
  type: "kernel";
  kernel_name: string;
  duration_ms: number;
}

export interface GpuMemcpyEvent {
  type: "memcpy";
  duration_ms: number;
}

export type GpuEvent = GpuKernelEvent | GpuMemcpyEvent;

export interface RawSession {
  id: string;
  start_time: number;
  end_time: number;
  cpu_samples: CpuSample[];
  gpu_events: GpuEvent[];
}
