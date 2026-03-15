/**
 * CorrelatedTimeline - GPU Timeline with CPU-GPU Correlation Support
 * 
 * This component extends the Timeline concept to add:
 * - Click handlers that emit selection events via CorrelationContext
 * - Visual highlighting for events related to selected flamegraph nodes
 * - Reverse correlation (clicking GPU event highlights flamegraph nodes)
 * 
 * IMPORTANT: This is a new component that preserves Timeline.tsx unchanged per AGENT.md rules.
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useCorrelation } from "../context/CorrelationContext";
import type { CorrelatedGpuEvent } from "../types/correlation";
import { findNodesByGpuEvent, correlatedFlamegraphData } from "../data/correlatedFlamegraphData";

interface CorrelatedTimelineProps {
    events: CorrelatedGpuEvent[];
    width?: number;
    height?: number;
    criticalPathEventIds?: string[];  // Week 2: IDs of events on the critical path
    showCriticalPath?: boolean;       // Week 2: Whether to show critical path overlay
}

const CorrelatedTimeline = ({ events, width, height = 400, criticalPathEventIds = [], showCriticalPath = false }: CorrelatedTimelineProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<any>(null);
    const [chartWidth, setChartWidth] = useState(width || 1200);

    // Correlation context
    const { state, selectGpuEvent, clearSelection } = useCorrelation();
    const { selection } = state;

    // Responsive width
    useEffect(() => {
        const handleResize = () => {
            if (svgRef.current) {
                const containerWidth = svgRef.current.parentElement?.clientWidth || 1200;
                setChartWidth(containerWidth - 40);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Main rendering effect
    useEffect(() => {
        if (!svgRef.current || !events.length) return;

        // Clear previous content
        d3.select(svgRef.current).selectAll("*").remove();

        // Get unique streams
        const streams = Array.from(new Set(events.map((e) => e.stream))).sort((a, b) => a - b);
        const numStreams = streams.length;

        // Dimensions
        const margin = { top: 40, right: 40, bottom: 40, left: 100 };
        const innerWidth = chartWidth - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const rowHeight = innerHeight / numStreams;

        // Time scale
        const maxTime = d3.max(events, (d) => d.endTime) || 100;
        const xScale = d3.scaleLinear()
            .domain([0, maxTime])
            .range([0, innerWidth]);

        // Base color scale
        const baseColorScale = (type: string) => {
            switch (type) {
                case "CUDA": return "#9b59b6";
                case "Memory": return "#e74c3c";
                case "Kernel": return "#3498db";
                default: return "#95a5a6";
            }
        };

        // SVG
        const svg = d3.select(svgRef.current)
            .attr("width", chartWidth)
            .attr("height", height);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Title
        svg.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("fill", "#fff")
            .attr("font-size", "16px")
            .attr("font-weight", "600")
            .text("GPU Timeline (Click to correlate with CPU)");

        // X-axis
        const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat((d) => `${d}ms`);
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xAxis as any)
            .selectAll("text")
            .attr("fill", "#aaa");

        g.selectAll(".domain, .tick line")
            .attr("stroke", "#444");

        // Y-axis (Stream labels)
        streams.forEach((stream, i) => {
            g.append("text")
                .attr("x", -10)
                .attr("y", i * rowHeight + rowHeight / 2)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#fff")
                .attr("font-size", "14px")
                .text(`Stream ${stream}`);

            // Horizontal grid lines
            if (i < numStreams - 1) {
                g.append("line")
                    .attr("x1", 0)
                    .attr("x2", innerWidth)
                    .attr("y1", (i + 1) * rowHeight)
                    .attr("y2", (i + 1) * rowHeight)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);
            }
        });

        // Create tooltip
        if (!tooltipRef.current) {
            tooltipRef.current = d3
                .select("body")
                .append("div")
                .attr("class", "timeline-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", "rgba(0, 0, 0, 0.95)")
                .style("color", "#fff")
                .style("padding", "10px 14px")
                .style("border-radius", "6px")
                .style("font-size", "13px")
                .style("pointer-events", "none")
                .style("z-index", "10000")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)");
        }

        const tooltip = tooltipRef.current;

        // Determine if an event should be highlighted
        const getEventStyle = (event: CorrelatedGpuEvent) => {
            // Week 2: Critical path takes priority when enabled
            const isOnCriticalPath = showCriticalPath && criticalPathEventIds.includes(event.id);

            if (isOnCriticalPath) {
                return {
                    opacity: 1,
                    strokeColor: "#e74c3c",
                    strokeWidth: 4,
                    glowFilter: true,
                    isCritical: true,
                };
            }

            if (selection.type === 'flamegraph' && selection.relatedIds.length > 0) {
                // Flamegraph node selected - highlight related GPU events
                const isRelated = selection.relatedIds.includes(event.id);
                return {
                    opacity: isRelated ? 1 : (showCriticalPath ? 0.3 : 0.25),
                    strokeColor: isRelated ? "#00ff88" : "none",
                    strokeWidth: isRelated ? 3 : 0,
                    glowFilter: isRelated,
                    isCritical: false,
                };
            } else if (selection.type === 'timeline' && selection.nodeId === event.id) {
                // This GPU event is selected
                return {
                    opacity: 1,
                    strokeColor: "#ffd700",
                    strokeWidth: 3,
                    glowFilter: true,
                    isCritical: false,
                };
            }
            return {
                opacity: showCriticalPath ? 0.4 : 0.9,
                strokeColor: "none",
                strokeWidth: 0,
                glowFilter: false,
                isCritical: false,
            };
        };

        // Add glow filter definition
        const defs = svg.append("defs");
        const filter = defs.append("filter")
            .attr("id", "glow")
            .attr("filterUnits", "userSpaceOnUse");
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "3")
            .attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Draw events as rectangles
        g.selectAll(".event-rect")
            .data(events)
            .enter()
            .append("rect")
            .attr("class", "event-rect")
            .attr("data-event-id", (d) => d.id)
            .attr("x", (d) => xScale(d.startTime))
            .attr("y", (d) => {
                const streamIndex = streams.indexOf(d.stream);
                return streamIndex * rowHeight + rowHeight * 0.1;
            })
            .attr("width", (d) => xScale(d.endTime) - xScale(d.startTime))
            .attr("height", rowHeight * 0.8)
            .attr("fill", (d) => baseColorScale(d.type))
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("opacity", (d) => getEventStyle(d).opacity)
            .attr("stroke", (d) => getEventStyle(d).strokeColor)
            .attr("stroke-width", (d) => getEventStyle(d).strokeWidth)
            .attr("filter", (d) => getEventStyle(d).glowFilter ? "url(#glow)" : "none")
            .style("cursor", "pointer")
            .on("mouseover", function (_event: any, d: any) {
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);

                const relatedNodes = d.relatedFlamegraphNodes || [];
                let tooltipHtml = `<strong>${d.name}</strong><br/>Type: ${d.type}<br/>Stream: ${d.stream}<br/>Duration: ${d.endTime - d.startTime}ms<br/>Start: ${d.startTime}ms`;

                if (relatedNodes.length > 0) {
                    tooltipHtml += `<br/><br/><span style="color: #e74c3c; font-weight: 600;">Related CPU Functions:</span>`;
                    tooltipHtml += `<br/>• ${relatedNodes.length} stack frames`;
                }

                tooltip.html(tooltipHtml).style("visibility", "visible");
            })
            .on("mousemove", function (event: any) {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 15 + "px");
            })
            .on("mouseout", function (_event: any, d: any) {
                const style = getEventStyle(d);
                d3.select(this)
                    .attr("opacity", style.opacity)
                    .attr("stroke", style.strokeColor)
                    .attr("stroke-width", style.strokeWidth);
                tooltip.style("visibility", "hidden");
            })
            .on("click", function (event: any, d: any) {
                event.stopPropagation();

                // Find related flamegraph nodes
                const relatedNodes = d.relatedFlamegraphNodes ||
                    findNodesByGpuEvent(correlatedFlamegraphData, d.id);

                // Emit selection event
                selectGpuEvent(d.id, relatedNodes);
            });

        // Add text labels on rectangles (if wide enough)
        g.selectAll(".event-label")
            .data(events)
            .enter()
            .append("text")
            .attr("class", "event-label")
            .attr("x", (d) => xScale(d.startTime) + (xScale(d.endTime) - xScale(d.startTime)) / 2)
            .attr("y", (d) => {
                const streamIndex = streams.indexOf(d.stream);
                return streamIndex * rowHeight + rowHeight / 2;
            })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#fff")
            .attr("font-size", "11px")
            .attr("pointer-events", "none")
            .text((d) => {
                const barWidth = xScale(d.endTime) - xScale(d.startTime);
                if (barWidth <= 30) return "";
                const maxChars = Math.max(1, Math.floor(barWidth / 7));
                return d.name.length > maxChars ? d.name.slice(0, maxChars - 1) + "…" : d.name;
            });

        // Cleanup
        return () => {
            if (tooltipRef.current) {
                tooltipRef.current.remove();
                tooltipRef.current = null;
            }
        };
    }, [events, chartWidth, height, selection, selectGpuEvent]);

    return (
        <div style={{ width: "100%" }}>
            {/* Selection indicator */}
            {selection.type === 'timeline' && (
                <div
                    style={{
                        background: "linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05))",
                        border: "1px solid rgba(255, 215, 0, 0.3)",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        marginBottom: "15px",
                        display: "flex",
                        gap: "16px",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div>
                        <span style={{ color: "#ffd700", fontWeight: "600" }}>Selected GPU Event: </span>
                        <span style={{ color: "#fff" }}>
                            {events.find(e => e.id === selection.nodeId)?.name || selection.nodeId}
                        </span>
                        <span style={{ color: "#888", marginLeft: "12px" }}>
                            → {selection.relatedIds.length} related CPU frames
                        </span>
                    </div>
                    <button
                        onClick={clearSelection}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #ffd700",
                            background: "transparent",
                            color: "#ffd700",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        Clear
                    </button>
                </div>
            )}

            <div style={{ overflowX: "auto" }}>
                <svg
                    ref={svgRef}
                    style={{
                        background: "transparent",
                        borderRadius: "8px",
                        display: "block",
                    }}
                />
            </div>

            {/* Legend */}
            <div
                style={{
                    display: "flex",
                    gap: "20px",
                    marginTop: "12px",
                    justifyContent: "center",
                    fontSize: "13px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", background: "#9b59b6", borderRadius: "3px" }} />
                    <span style={{ color: "#aaa" }}>CUDA</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", background: "#e74c3c", borderRadius: "3px" }} />
                    <span style={{ color: "#aaa" }}>Memory</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", background: "#3498db", borderRadius: "3px" }} />
                    <span style={{ color: "#aaa" }}>Kernel</span>
                </div>
            </div>
        </div>
    );
};

export default CorrelatedTimeline;
