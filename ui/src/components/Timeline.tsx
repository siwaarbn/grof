import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GpuEvent } from "../data/mockGpuEvents";

interface TimelineProps {
    events: GpuEvent[];
    width?: number;
    height?: number;
}

const Timeline = ({ events, width, height = 400 }: TimelineProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<any>(null);
    const [chartWidth, setChartWidth] = useState(width || 1200);

    // Responsive width
    useEffect(() => {
        const handleResize = () => {
            if (svgRef.current) {
                const containerWidth = svgRef.current. parentElement?.clientWidth || 1200;
                setChartWidth(containerWidth - 40);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!svgRef.current || !events.length) return;

        // Clear previous content
        d3.select(svgRef.current).selectAll("*").remove();

        // Get unique streams
        const streams = Array.from(new Set(events. map((e) => e.stream))).sort((a, b) => a - b);
        const numStreams = streams.length;

        // Dimensions
        const margin = { top:  40, right: 40, bottom:  40, left: 100 };
        const innerWidth = chartWidth - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const rowHeight = innerHeight / numStreams;

        // Time scale
        const maxTime = d3.max(events, (d) => d.endTime) || 100;
        const xScale = d3.scaleLinear()
            .domain([0, maxTime])
            .range([0, innerWidth]);

        // Color scale
        const colorScale = (type: string) => {
            switch (type) {
                case "CUDA":
                    return "#9b59b6"; // Purple
                case "Memory":
                    return "#e74c3c"; // Red
                case "Kernel":
                    return "#3498db"; // Blue
                default:
                    return "#95a5a6"; // Gray
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
            .text("GPU Timeline (Gantt Chart)");

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
                    . attr("stroke", "#333")
                    .attr("stroke-width", 1);
            }
        });

        // Create tooltip
        if (! tooltipRef.current) {
            tooltipRef.current = d3
                .select("body")
                .append("div")
                .attr("class", "timeline-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", "rgba(0, 0, 0, 0.9)")
                .style("color", "#fff")
                .style("padding", "8px 12px")
                .style("border-radius", "4px")
                .style("font-size", "13px")
                .style("pointer-events", "none")
                .style("z-index", "10000")
                .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)");
        }

        const tooltip = tooltipRef.current;

        // Draw events as rectangles
        g.selectAll(".event-rect")
            .data(events)
            .enter()
            .append("rect")
            .attr("class", "event-rect")
            .attr("x", (d) => xScale(d.startTime))
            .attr("y", (d) => {
                const streamIndex = streams.indexOf(d.stream);
                return streamIndex * rowHeight + rowHeight * 0.1;
            })
            .attr("width", (d) => xScale(d.endTime) - xScale(d.startTime))
            .attr("height", rowHeight * 0.8)
            .attr("fill", (d) => colorScale(d.type))
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("opacity", 0.9)
            .style("cursor", "pointer")
            .on("mouseover", function (event:  any, d:  any) {
                d3.select(this).attr("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 2);
                tooltip
                    .html(
                        `<strong>${d.name}</strong><br/>Type: ${d.type}<br/>Stream: ${d.stream}<br/>Duration: ${d.endTime - d.startTime}ms<br/>Start: ${d.startTime}ms`
                    )
                    . style("visibility", "visible");
            })
            .on("mousemove", function (event: any) {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("opacity", 0.9).attr("stroke", "none");
                tooltip.style("visibility", "hidden");
            });

        // Add text labels on rectangles (if wide enough)
        g.selectAll(".event-label")
            .data(events)
            .enter()
            .append("text")
            .attr("class", "event-label")
            .attr("x", (d) => xScale(d.startTime) + (xScale(d.endTime) - xScale(d.startTime)) / 2)
            .attr("y", (d) => {
                const streamIndex = streams. indexOf(d.stream);
                return streamIndex * rowHeight + rowHeight / 2;
            })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#fff")
            .attr("font-size", "11px")
            .attr("pointer-events", "none")
            .text((d) => {
                const width = xScale(d.endTime) - xScale(d.startTime);
                return width > 50 ? d.name : "";
            });

        // Cleanup
        return () => {
            if (tooltipRef.current) {
                tooltipRef.current.remove();
                tooltipRef.current = null;
            }
        };
    }, [events, chartWidth, height]);

    return (
        <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
                ref={svgRef}
                style={{
                    background: "#1e1e1e",
                    borderRadius: "8px",
                    display: "block",
                }}
            />
        </div>
    );
};

export default Timeline;