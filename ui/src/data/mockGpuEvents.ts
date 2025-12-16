export interface GpuEvent {
    id: string;
    stream: number;
    name: string;
    startTime: number;
    endTime: number;
    type: "CUDA" | "Memory" | "Kernel";
}

export const mockGpuEvents: GpuEvent[] = [
    // Stream 0 (Row 1)
    {
        id: "evt-001",
        stream: 0,
        name: "conv2d_forward",
        startTime: 0,
        endTime: 25,
        type:  "CUDA",
    },
    {
        id: "evt-002",
        stream: 0,
        name: "cudaMemcpy_HtoD",
        startTime: 26,
        endTime: 35,
        type: "Memory",
    },
    {
        id: "evt-003",
        stream: 0,
        name: "relu_kernel",
        startTime: 36,
        endTime: 46,
        type: "Kernel",
    },
    {
        id: "evt-004",
        stream: 0,
        name: "batch_norm_forward",
        startTime: 47,
        endTime: 62,
        type: "CUDA",
    },
    {
        id: "evt-005",
        stream: 0,
        name: "max_pool2d",
        startTime: 63,
        endTime: 80,
        type: "Kernel",
    },

    // Stream 1 (Row 2)
    {
        id: "evt-006",
        stream:  1,
        name: "conv2d_backward",
        startTime: 10,
        endTime: 40,
        type: "CUDA",
    },
    {
        id:  "evt-007",
        stream: 1,
        name:  "cudaMemcpy_DtoH",
        startTime:  42,
        endTime:  50,
        type: "Memory",
    },
    {
        id: "evt-008",
        stream: 1,
        name: "relu_backward",
        startTime: 52,
        endTime: 68,
        type: "Kernel",
    },
    {
        id: "evt-009",
        stream: 1,
        name: "optimizer_step",
        startTime: 70,
        endTime: 85,
        type: "CUDA",
    },
];