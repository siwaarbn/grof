/**
 * Mock Critical Path Data
 * 
 * Simulates critical path analysis results that would come from the backend.
 * The critical path represents the longest chain of dependent operations.
 * 
 * This mock data links to existing GPU events from correlatedGpuEvents.ts
 * When real API is ready, replace with fetch from /sessions/{id}/critical-path
 */

import type { CriticalPath, CriticalPathInsight, DependencyEdge } from "../types/criticalPath";

// Mock critical path for session-001 (ResNet50 Training)
export const mockCriticalPath: CriticalPath = {
    sessionId: "session-001",
    totalPathTime: 68,        // Sum of critical path durations
    totalRuntime: 85,         // Total wall-clock time
    parallelismGap: 17,       // Potential improvement
    utilizationPercent: 80,   // 68/85 * 100
    nodes: [
        {
            eventId: "evt-001",
            name: "conv2d_forward",
            startTime: 0,
            endTime: 25,
            type: "gpu",
            stream: 0,
            dependencies: [],
            isCritical: true,
        },
        {
            eventId: "evt-002",
            name: "cudaMemcpy_HtoD",
            startTime: 26,
            endTime: 35,
            type: "transfer",
            stream: 0,
            dependencies: ["evt-001"],
            isCritical: true,
        },
        {
            eventId: "evt-003",
            name: "relu_kernel",
            startTime: 36,
            endTime: 46,
            type: "gpu",
            stream: 0,
            dependencies: ["evt-002"],
            isCritical: true,
        },
        {
            eventId: "evt-004",
            name: "batch_norm_forward",
            startTime: 47,
            endTime: 62,
            type: "gpu",
            stream: 0,
            dependencies: ["evt-003"],
            isCritical: false,  // Runs in parallel, not on critical path
        },
        {
            eventId: "evt-006",
            name: "conv2d_backward",
            startTime: 10,
            endTime: 40,
            type: "gpu",
            stream: 1,
            dependencies: ["evt-001"],
            isCritical: true,
        },
        {
            eventId: "evt-008",
            name: "relu_backward",
            startTime: 52,
            endTime: 68,
            type: "gpu",
            stream: 1,
            dependencies: ["evt-006"],
            isCritical: true,
        },
    ],
};

// Dependency edges for visualization
export const mockDependencyEdges: DependencyEdge[] = [
    { from: "evt-001", to: "evt-002", type: "data" },
    { from: "evt-002", to: "evt-003", type: "order" },
    { from: "evt-003", to: "evt-004", type: "order" },
    { from: "evt-001", to: "evt-006", type: "data" },
    { from: "evt-006", to: "evt-008", type: "order" },
    { from: "evt-003", to: "evt-008", type: "sync" },
];

// Pre-computed insight for the mock data
export const mockCriticalPathInsight: CriticalPathInsight = {
    bottleneckName: "conv2d_backward",
    bottleneckDuration: 30,
    gpuTimeOnPath: 53,
    cpuTimeOnPath: 6,
    transferTimeOnPath: 9,
    recommendation: "Consider optimizing conv2d_backward or using gradient checkpointing to reduce memory transfer overhead.",
};

// Helper function to check if an event is on the critical path
export function isOnCriticalPath(eventId: string): boolean {
    const node = mockCriticalPath.nodes.find(n => n.eventId === eventId);
    return node?.isCritical ?? false;
}

// Helper function to get critical path event IDs
export function getCriticalPathEventIds(): string[] {
    return mockCriticalPath.nodes
        .filter(n => n.isCritical)
        .map(n => n.eventId);
}
