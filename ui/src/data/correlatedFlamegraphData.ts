/**
 * Mock Flamegraph Data with Correlation IDs
 * 
 * Extended from original mockFlamegraphData.ts to include:
 * - Unique ID for each node
 * - relatedGpuEvents linking to GPU event IDs
 * 
 * This enables bidirectional correlation between Flamegraph and Timeline.
 * When switching to real API, replace with data from /sessions/{id}/flamegraph
 */

import type { FlamegraphNode } from "../types/correlation";

export const correlatedFlamegraphData: FlamegraphNode = {
    id: "node-root",
    name: "root",
    value: 100,
    children: [
        {
            id: "node-train-epoch",
            name: "train_epoch [Python]",
            value: 80,
            relatedGpuEvents: ["evt-001", "evt-002", "evt-003", "evt-004", "evt-005", "evt-006", "evt-007", "evt-008", "evt-009"],
            children: [
                {
                    id: "node-forward-pass",
                    name: "forward_pass [Python]",
                    value: 40,
                    relatedGpuEvents: ["evt-001", "evt-002", "evt-003", "evt-004", "evt-005"],
                    children: [
                        {
                            id: "node-conv2d-forward",
                            name: "conv2d_forward [CUDA]",
                            value: 25,
                            relatedGpuEvents: ["evt-001"],
                            children: []
                        },
                        {
                            id: "node-relu-kernel",
                            name: "relu_kernel [CUDA]",
                            value: 10,
                            relatedGpuEvents: ["evt-003"],
                            children: []
                        },
                        {
                            id: "node-batch-norm",
                            name: "batch_norm [C++]",
                            value: 5,
                            relatedGpuEvents: ["evt-004"],
                            children: []
                        },
                    ],
                },
                {
                    id: "node-backward-pass",
                    name: "backward_pass [Python]",
                    value: 30,
                    relatedGpuEvents: ["evt-006", "evt-007", "evt-008", "evt-009"],
                    children: [
                        {
                            id: "node-conv2d-backward",
                            name: "conv2d_backward [CUDA]",
                            value: 20,
                            relatedGpuEvents: ["evt-006"],
                            children: []
                        },
                        {
                            id: "node-relu-backward",
                            name: "relu_backward [CUDA]",
                            value: 8,
                            relatedGpuEvents: ["evt-008"],
                            children: []
                        },
                        {
                            id: "node-optimizer-step",
                            name: "optimizer_step [C++]",
                            value: 2,
                            relatedGpuEvents: ["evt-009"],
                            children: []
                        },
                    ],
                },
                {
                    id: "node-data-loading",
                    name: "data_loading [Python]",
                    value: 10,
                    relatedGpuEvents: [], // CPU-only operation
                    children: [],
                },
            ],
        },
        {
            id: "node-validation",
            name: "validation [Python]",
            value: 15,
            relatedGpuEvents: [],
            children: [
                {
                    id: "node-inference",
                    name: "inference [CUDA]",
                    value: 12,
                    relatedGpuEvents: [],
                    children: []
                },
                {
                    id: "node-metrics",
                    name: "metrics_computation [Python]",
                    value: 3,
                    relatedGpuEvents: [],
                    children: []
                },
            ],
        },
        {
            id: "node-logging",
            name: "logging [Python]",
            value: 5,
            relatedGpuEvents: [], // CPU-only operation
            children: [],
        },
    ],
};

// Helper function to find a node by ID
export function findNodeById(node: FlamegraphNode, id: string): FlamegraphNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
    }
    return null;
}

// Helper function to get all node IDs that have a specific GPU event
export function findNodesByGpuEvent(node: FlamegraphNode, eventId: string): string[] {
    const result: string[] = [];
    if (node.relatedGpuEvents?.includes(eventId)) {
        result.push(node.id);
    }
    for (const child of node.children) {
        result.push(...findNodesByGpuEvent(child, eventId));
    }
    return result;
}
