export interface Session {
    id: string;
    name: string;
    date: string;
    duration:  number;
    status: "completed" | "running" | "failed";
    gpuUsage:  number;
    cpuUsage: number;
}

export const mockSessions: Session[] = [
    {
        id: "session-001",
        name: "ResNet50 Training - Epoch 1",
        date:  "2025-12-16 09:30:00",
        duration: 3542,
        status: "completed",
        gpuUsage: 87,
        cpuUsage:  45,
    },
    {
        id: "session-002",
        name: "BERT Fine-tuning",
        date: "2025-12-16 08:15:00",
        duration: 7823,
        status: "completed",
        gpuUsage:  92,
        cpuUsage: 38,
    },
    {
        id: "session-003",
        name: "GPT-2 Inference Benchmark",
        date: "2025-12-15 22:45:00",
        duration: 1205,
        status: "completed",
        gpuUsage:  78,
        cpuUsage: 52,
    },
    {
        id: "session-004",
        name:  "YOLOv8 Object Detection",
        date: "2025-12-15 18:30:00",
        duration: 4521,
        status: "failed",
        gpuUsage:  65,
        cpuUsage:  71,
    },
    {
        id: "session-005",
        name: "Stable Diffusion Generation",
        date: "2025-12-15 14:00:00",
        duration: 892,
        status: "completed",
        gpuUsage:  95,
        cpuUsage:  23,
    },
    {
        id: "session-006",
        name: "LLaMA-7B Training",
        date: "2025-12-14 10:00:00",
        duration: 28934,
        status: "running",
        gpuUsage:  99,
        cpuUsage:  67,
    },
];