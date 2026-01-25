/**
 * Correlation Types - Links between Flamegraph nodes and GPU Timeline events
 * 
 * These types extend the existing data structures to support bidirectional
 * correlation between CPU (flamegraph) and GPU (timeline) views.
 * 
 * Designed for easy replacement with real API data in the future.
 */

// Extended Flamegraph node with correlation support
export interface FlamegraphNode {
    id: string;
    name: string;
    value: number;
    children: FlamegraphNode[];
    relatedGpuEvents?: string[]; // IDs of related GPU events
}

// Extended GPU Event with correlation support
export interface CorrelatedGpuEvent {
    id: string;
    stream: number;
    name: string;
    startTime: number;
    endTime: number;
    type: "CUDA" | "Memory" | "Kernel";
    relatedFlamegraphNodes?: string[]; // IDs of related flamegraph nodes
}

// Selection state for correlation view
export interface CorrelationSelection {
    type: 'flamegraph' | 'timeline' | null;
    nodeId: string | null;
    relatedIds: string[];
}

// Aggregated GPU stats for a flamegraph node
export interface GpuStats {
    kernelCount: number;
    totalGpuTime: number;
    eventNames: string[];
}
