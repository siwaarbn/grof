/**
 * CorrelatedFlamegraph - Flamegraph with CPU-GPU Correlation Support
 * 
 * This component wraps the existing Flamegraph component to add:
 * - Click handlers that emit selection events via CorrelationContext
 * - Visual highlighting for nodes related to selected GPU events
 * - Enhanced tooltips showing GPU kernel counts and time
 * 
 * IMPORTANT: This preserves the original Flamegraph.tsx unchanged per AGENT.md rules.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { flamegraph } from "d3-flame-graph";
import "d3-flame-graph/dist/d3-flamegraph.css";
import * as d3 from "d3";
import { useCorrelation } from "../context/CorrelationContext";
import type { FlamegraphNode } from "../types/correlation";
import { calculateGpuStats } from "../data/correlatedGpuEvents";

interface CorrelatedFlamegraphProps {
    data: FlamegraphNode;
    width?: number;
    height?: number;
    criticalPathNames?: Set<string>;
    showCriticalPath?: boolean;
}

const CorrelatedFlamegraph = ({ data, width, height = 600, criticalPathNames, showCriticalPath = false }: CorrelatedFlamegraphProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<any>(null);
    const chartInstanceRef = useRef<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [chartWidth, setChartWidth] = useState(0);

    // Correlation context
    const { state, selectFlamegraphNode, clearSelection, setGpuStats } = useCorrelation();
    const { selection } = state;

    // Responsive width handling
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                setChartWidth(width > 0 ? width : 1200);
            }
        };

        const timer = setTimeout(updateWidth, 50);
        window.addEventListener("resize", updateWidth);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", updateWidth);
        };
    }, []);

    // Build flamegraph chart
    useEffect(() => {
        if (!chartRef.current || !data || chartWidth === 0) return;

        d3.select(chartRef.current).selectAll("*").remove();

        const chart = flamegraph()
            .width(chartWidth)
            .height(height)
            .cellHeight(24)
            .transitionDuration(750)
            .minFrameSize(1)
            .transitionEase(d3.easeCubic)
            .sort(true)
            .title("")
            .inverted(false)
            .color((d: any) => {
                const name = d?.data?.name || "";
                const n = name.toLowerCase();
                
                // PyTorch / Neural Net Ops
                if (n.includes("aten::")) return "#0ea5e9"; // Sky Blue
                if (n.includes("torch") || n.includes("nn")) return "#e11d48"; // PyTorch Red
                if (n.includes("forward") || n.includes("train") || n.includes("epoch")) return "#10b981"; // Emerald
                if (n.includes("backward")) return "#f59e0b"; // Amber
                
                // CUDA / Kernels
                if (n.includes("cuda")) return "#6366f1"; // Indigo
                if (n.includes("conv") || n.includes("gemm") || n.includes("linear")) return "#8b5cf6"; // Violet
                
                // Python / C++ specific
                if (name.includes("[Python]")) return "#f43f5e";
                if (name.includes("[C++]")) return "#3b82f6";
                if (name.includes("[CUDA]")) return "#8b5cf6";

                // Fallback Hash Color
                const hash = name.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
                const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#6366f1", "#d946ef", "#f43f5e"];
                return colors[Math.abs(hash) % colors.length] || "#94a3b8";
            });

        chartInstanceRef.current = chart;

        const chartContainer = d3.select(chartRef.current);
        chartContainer.datum(data).call(chart as any);

        // Stamp data-node-id on every rect so ConnectionThread can query them
        chartContainer.selectAll("rect").each(function () {
            const rectData = d3.select(this).datum() as any;
            const nodeId = rectData?.data?.id;
            if (nodeId) d3.select(this).attr("data-node-id", nodeId);
        });

        // Create tooltip
        if (!tooltipRef.current) {
            tooltipRef.current = d3
                .select("body")
                .append("div")
                .attr("class", "flamegraph-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", "rgba(0, 0, 0, 0.95)")
                .style("color", "#fff")
                .style("padding", "10px 14px")
                .style("border-radius", "6px")
                .style("font-size", "13px")
                .style("pointer-events", "none")
                .style("z-index", "10000")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)")
                .style("max-width", "300px");
        }

        const tooltip = tooltipRef.current;

        // Add enhanced mouse and click handlers
        chartContainer
            .selectAll("rect")
            .on("mouseover", function (event: any) {
                const rect = d3.select(this);
                const rectData = rect.datum() as any;

                if (rectData?.data) {
                    const nodeData = rectData.data as FlamegraphNode;
                    const gpuEvents = nodeData.relatedGpuEvents || [];

                    let tooltipHtml = `<strong>${nodeData.name}</strong><br/>Time: ${nodeData.value}ms`;

                    // Add GPU stats if there are related events
                    if (gpuEvents.length > 0) {
                        const stats = calculateGpuStats(gpuEvents);
                        tooltipHtml += `<br/><br/><span style="color: #9b59b6; font-weight: 600;">GPU Activity:</span>`;
                        tooltipHtml += `<br/>• ${stats.kernelCount} kernels`;
                        tooltipHtml += `<br/>• ${stats.totalGpuTime}ms GPU time`;
                    }

                    tooltip.html(tooltipHtml).style("visibility", "visible");
                }
            })
            .on("mousemove", function (event: any) {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 15 + "px");
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            })
            .on("click", function (event: any) {
                event.stopPropagation();
                const rect = d3.select(this);
                const rectData = rect.datum() as any;

                if (rectData?.data) {
                    const nodeData = rectData.data as FlamegraphNode;
                    const gpuEvents = nodeData.relatedGpuEvents || [];

                    // Emit selection event
                    selectFlamegraphNode(nodeData.id, gpuEvents);

                    // Calculate and set GPU stats
                    if (gpuEvents.length > 0) {
                        setGpuStats(calculateGpuStats(gpuEvents));
                    } else {
                        setGpuStats(null);
                    }
                }
            });

        return () => {
            if (tooltipRef.current) {
                tooltipRef.current.remove();
                tooltipRef.current = null;
            }
        };
    }, [data, chartWidth, height, selectFlamegraphNode, setGpuStats]);

    // Update visual highlighting based on correlation selection
    useEffect(() => {
        if (!chartRef.current) return;

        const chartContainer = d3.select(chartRef.current);

        if (selection.type === 'timeline' && selection.relatedIds.length > 0) {
            // Highlight nodes related to selected GPU event
            chartContainer.selectAll("rect").each(function () {
                const rect = d3.select(this);
                const rectData = rect.datum() as any;
                const nodeId = rectData?.data?.id;

                if (nodeId && selection.relatedIds.includes(nodeId)) {
                    // Highlight related nodes
                    rect
                        .style("stroke", "#ffd700")
                        .style("stroke-width", "3px")
                        .style("opacity", 1);
                } else if (nodeId) {
                    // Dim unrelated nodes
                    rect
                        .style("stroke", "none")
                        .style("opacity", 0.4);
                }
            });
        } else if (selection.type === 'flamegraph') {
            // Highlight the selected node
            chartContainer.selectAll("rect").each(function () {
                const rect = d3.select(this);
                const rectData = rect.datum() as any;
                const nodeId = rectData?.data?.id;

                if (nodeId === selection.nodeId) {
                    rect
                        .style("stroke", "#00ff88")
                        .style("stroke-width", "3px")
                        .style("opacity", 1);
                } else {
                    rect
                        .style("stroke", "none")
                        .style("opacity", 1);
                }
            });
        } else {
            // Clear all highlighting
            chartContainer.selectAll("rect")
                .style("stroke", "none")
                .style("opacity", 1);
        }
    }, [selection]);

    // Critical path highlighting — red border on nodes whose name is on the critical path
    useEffect(() => {
        if (!chartRef.current) return;
        const container = d3.select(chartRef.current);

        if (!showCriticalPath || !criticalPathNames || criticalPathNames.size === 0) {
            // Remove critical path styles only when no correlation selection is active
            if (!selection.type) {
                container.selectAll("rect")
                    .style("stroke", "none")
                    .style("opacity", 1);
            }
            return;
        }

        container.selectAll("rect").each(function () {
            const rect = d3.select(this);
            const rectData = rect.datum() as any;
            const name: string = rectData?.data?.name || "";

            if (criticalPathNames.has(name)) {
                rect
                    .style("stroke", "#ef4444")
                    .style("stroke-width", "3px")
                    .style("opacity", 1);
            } else {
                rect
                    .style("stroke", "none")
                    .style("opacity", 0.4);
            }
        });
    }, [showCriticalPath, criticalPathNames, selection.type]);

    // Search highlighting
    useEffect(() => {
        if (!chartRef.current) return;

        if (!searchTerm) {
            // Only reset if no correlation selection is active
            if (!selection.type) {
                d3.select(chartRef.current).selectAll("rect").style("opacity", 1);
            }
            return;
        }

        d3.select(chartRef.current)
            .selectAll("rect")
            .style("opacity", function () {
                const rectData = d3.select(this).datum() as any;
                const name = rectData?.data?.name || "";
                return name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0.3;
            });
    }, [searchTerm, selection.type]);

    const handleReset = () => {
        setSearchTerm("");
        clearSelection();

        if (chartInstanceRef.current && chartInstanceRef.current.resetZoom) {
            chartInstanceRef.current.resetZoom();
        }

        if (chartRef.current) {
            d3.select(chartRef.current)
                .selectAll("rect")
                .style("opacity", 1)
                .style("stroke", "none");
        }
    };

    return (
        <div ref={containerRef} style={{ width: "100%" }}>
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "15px",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}
            >
                <div style={{ display: "flex", gap: "10px", flex: "1 1 250px" }}>
                    <input
                        type="text"
                        placeholder="Search functions (e.g. conv2d)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #262933",
                            background: "#13151A",
                            color: "#F8FAFC",
                            fontSize: "13px",
                            minWidth: "250px",
                            outline: "none",
                            width: "100%",
                        }}
                    />
                    <button
                        onClick={handleReset}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "1px solid #6366F1",
                            background: "rgba(99, 102, 241, 0.15)",
                            color: "#818CF8",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#6366F1"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)"; e.currentTarget.style.color = "#818CF8"; }}
                    >
                        Reset
                    </button>
                    {selection.type && (
                        <button
                            onClick={clearSelection}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "6px",
                                border: "1px solid #F43F5E",
                                background: "rgba(244, 63, 94, 0.15)",
                                color: "#F43F5E",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#F43F5E"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(244, 63, 94, 0.15)"; e.currentTarget.style.color = "#F43F5E"; }}
                        >
                            Clear Selection
                        </button>
                    )}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#94A3B8", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e11d48", border: "1px solid rgba(255,255,255,0.2)" }} /> <span>PyTorch / Python</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", border: "1px solid rgba(255,255,255,0.2)" }} /> <span>Forward / Train</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366f1", border: "1px solid rgba(255,255,255,0.2)" }} /> <span>CUDA Kernels</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0ea5e9", border: "1px solid rgba(255,255,255,0.2)" }} /> <span>C++ / System</span>
                    </div>
                </div>
            </div>

            {/* GPU Stats Panel */}
            {state.gpuStats && selection.type === 'flamegraph' && (
                <div
                    style={{
                        background: "linear-gradient(135deg, rgba(155, 89, 182, 0.15), rgba(155, 89, 182, 0.05))",
                        border: "1px solid rgba(155, 89, 182, 0.3)",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        marginBottom: "15px",
                        display: "flex",
                        gap: "24px",
                        alignItems: "center",
                    }}
                >
                    <span style={{ color: "#9b59b6", fontWeight: "600" }}>GPU Activity:</span>
                    <span style={{ color: "#fff" }}>
                        <strong>{state.gpuStats.kernelCount}</strong> kernels
                    </span>
                    <span style={{ color: "#fff" }}>
                        <strong>{state.gpuStats.totalGpuTime}ms</strong> GPU time
                    </span>
                </div>
            )}

            <div
                ref={chartRef}
                style={{
                    background: "transparent",
                    borderRadius: "8px",
                    padding: "0",
                    cursor: "pointer",
                    overflow: "hidden",
                    width: "100%",
                }}
            />
        </div>
    );
};

export default CorrelatedFlamegraph;
