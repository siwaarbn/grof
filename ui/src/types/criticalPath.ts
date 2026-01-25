/**
 * Critical Path Types
 * 
 * Types for representing the critical execution path in a profiling session.
 * The critical path is the longest chain of dependent operations that determines
 * the minimum possible execution time.
 * 
 * Designed for easy replacement with real API data from /sessions/{id}/critical-path
 */

// A single node in the critical path
export interface CriticalPathNode {
    eventId: string;          // Links to GPU event ID or CPU sample ID
    name: string;             // Human-readable name
    startTime: number;        // Start time in ms
    endTime: number;          // End time in ms
    type: "cpu" | "gpu" | "transfer";  // Operation type
    stream?: number;          // GPU stream ID (for GPU events)
    dependencies: string[];   // IDs of events this node depends on
    isCritical: boolean;      // Whether this node is on the critical path
}

// Complete critical path analysis
export interface CriticalPath {
    sessionId: string;
    totalPathTime: number;    // Sum of durations on the critical path (ms)
    totalRuntime: number;     // Wall-clock runtime of the session (ms)
    parallelismGap: number;   // totalRuntime - totalPathTime (potential improvement)
    utilizationPercent: number; // (totalPathTime / totalRuntime) * 100
    nodes: CriticalPathNode[];
}

// Dependency edge for visualization
export interface DependencyEdge {
    from: string;  // Source event ID
    to: string;    // Target event ID
    type: "data" | "sync" | "order";  // Dependency type
}

// Critical path analysis summary
export interface CriticalPathInsight {
    bottleneckName: string;   // Longest single operation on the path
    bottleneckDuration: number;
    gpuTimeOnPath: number;    // Total GPU time on critical path
    cpuTimeOnPath: number;    // Total CPU time on critical path
    transferTimeOnPath: number; // Total transfer time on critical path
    recommendation: string;   // Optimization recommendation
}
