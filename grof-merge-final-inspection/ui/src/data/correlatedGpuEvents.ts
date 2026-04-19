/**
 * Mock GPU Events with Correlation IDs
 * 
 * Extended from original mockGpuEvents.ts to include:
 * - relatedFlamegraphNodes linking back to flamegraph node IDs
 * 
 * This enables bidirectional correlation between Timeline and Flamegraph.
 * When switching to real API, replace with data from /sessions/{id}/gpu-events
 */

import type { CorrelatedGpuEvent } from "../types/correlation";

export const correlatedGpuEvents: CorrelatedGpuEvent[] = [
    // Stream 0 (Row 1) - Forward pass operations
    {
        id: "evt-001",
        stream: 0,
        name: "conv2d_forward",
        startTime: 0,
        endTime: 25,
        type: "CUDA",
        relatedFlamegraphNodes: ["node-conv2d-forward", "node-forward-pass", "node-train-epoch"],
    },
    {
        id: "evt-002",
        stream: 0,
        name: "cudaMemcpy_HtoD",
        startTime: 26,
        endTime: 35,
        type: "Memory",
        relatedFlamegraphNodes: ["node-forward-pass", "node-train-epoch"],
    },
    {
        id: "evt-003",
        stream: 0,
        name: "relu_kernel",
        startTime: 36,
        endTime: 46,
        type: "Kernel",
        relatedFlamegraphNodes: ["node-relu-kernel", "node-forward-pass", "node-train-epoch"],
    },
    {
        id: "evt-004",
        stream: 0,
        name: "batch_norm_forward",
        startTime: 47,
        endTime: 62,
        type: "CUDA",
        relatedFlamegraphNodes: ["node-batch-norm", "node-forward-pass", "node-train-epoch"],
    },
    {
        id: "evt-005",
        stream: 0,
        name: "max_pool2d",
        startTime: 63,
        endTime: 80,
        type: "Kernel",
        relatedFlamegraphNodes: ["node-forward-pass", "node-train-epoch"],
    },

    // Stream 1 (Row 2) - Backward pass operations
    {
        id: "evt-006",
        stream: 1,
        name: "conv2d_backward",
        startTime: 10,
        endTime: 40,
        type: "CUDA",
        relatedFlamegraphNodes: ["node-conv2d-backward", "node-backward-pass", "node-train-epoch"],
    },
    {
        id: "evt-007",
        stream: 1,
        name: "cudaMemcpy_DtoH",
        startTime: 42,
        endTime: 50,
        type: "Memory",
        relatedFlamegraphNodes: ["node-backward-pass", "node-train-epoch"],
    },
    {
        id: "evt-008",
        stream: 1,
        name: "relu_backward",
        startTime: 52,
        endTime: 68,
        type: "Kernel",
        relatedFlamegraphNodes: ["node-relu-backward", "node-backward-pass", "node-train-epoch"],
    },
    {
        id: "evt-009",
        stream: 1,
        name: "optimizer_step",
        startTime: 70,
        endTime: 85,
        type: "CUDA",
        relatedFlamegraphNodes: ["node-optimizer-step", "node-backward-pass", "node-train-epoch"],
    },
];

// Helper to find GPU event by ID
export function findGpuEventById(eventId: string): CorrelatedGpuEvent | undefined {
    return correlatedGpuEvents.find(e => e.id === eventId);
}

// Helper to get GPU events related to a flamegraph node
export function getGpuEventsForNode(nodeId: string): CorrelatedGpuEvent[] {
    return correlatedGpuEvents.filter(e =>
        e.relatedFlamegraphNodes?.includes(nodeId)
    );
}

// Calculate GPU stats for a flamegraph node selection
export function calculateGpuStats(relatedEventIds: string[]): { kernelCount: number; totalGpuTime: number; eventNames: string[] } {
    const events = correlatedGpuEvents.filter(e => relatedEventIds.includes(e.id));
    const totalGpuTime = events.reduce((sum, e) => sum + (e.endTime - e.startTime), 0);
    return {
        kernelCount: events.length,
        totalGpuTime,
        eventNames: events.map(e => e.name),
    };
}
