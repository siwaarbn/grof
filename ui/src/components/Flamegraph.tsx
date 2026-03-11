// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { flamegraph } from "d3-flame-graph";
import "d3-flame-graph/dist/d3-flamegraph.css";
import * as d3 from "d3";
import { useCorrelation } from "../context/CorrelationContext";

interface FlamegraphProps {
    data: any;
    width?: number;
    height?: number;
}

const Flamegraph = ({ data, width, height = 600 }: FlamegraphProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<any>(null);
    const chartInstanceRef = useRef<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [chartWidth, setChartWidth] = useState(0);

    // Week 2/4: Integration with Correlation Engine
    const { state } = useCorrelation();
    const { selection } = state;

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
                // Audit Requirement: Warm colors for Python, Cool for C++/CUDA
                if (name.includes("[Python]")) return "#e74c3c";
                if (name.includes("[C++]")) return "#3498db";
                if (name.includes("[CUDA]")) return "#9b59b6";
                return "#95a5a6";
            });

        chartInstanceRef.current = chart;

        const chartContainer = d3.select(chartRef.current);
        chartContainer.datum(data).call(chart as any);

        if (!tooltipRef.current) {
            tooltipRef.current = d3
                .select("body")
                .append("div")
                .attr("class", "flamegraph-tooltip")
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

        chartContainer
            .selectAll("rect")
            .on("mouseover", function (event: any) {
                const rect = d3.select(this);
                const rectData = rect.datum() as any;

                if (rectData?.data) {
                    tooltip
                        .html(
                            `<strong>${rectData.data.name}</strong><br/>Time: ${rectData.data.value}ms`
                        )
                        .style("visibility", "visible");
                }
            })
            .on("mousemove", function (event: any) {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            });

        return () => {
            if (tooltipRef.current) {
                tooltipRef.current.remove();
                tooltipRef.current = null;
            }
        };
    }, [data, chartWidth, height]);

    // Combined Search + Correlation Filter
    useEffect(() => {
        if (!chartRef.current) return;

        d3.select(chartRef.current)
            .selectAll("rect")
            .style("opacity", function () {
                const rectData = d3.select(this).datum() as any;
                const name = rectData?.data?.name || "";
                const nodeId = rectData?.data?.id;
                
                // Check Search Match
                const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());
                
                // Check Correlation Match (If a GPU event is clicked)
                let matchesCorrelation = true;
                if (selection.type === 'timeline' && selection.relatedIds.length > 0) {
                    matchesCorrelation = selection.relatedIds.includes(nodeId);
                }

                return (matchesSearch && matchesCorrelation) ? 1 : 0.2;
            })
            // Highlight correlation with a gold stroke if selected
            .style("stroke", function() {
                const rectData = d3.select(this).datum() as any;
                if (selection.type === 'timeline' && selection.relatedIds.includes(rectData?.data?.id)) {
                    return "#ffd700";
                }
                return "none";
            })
            .style("stroke-width", function() {
                const rectData = d3.select(this).datum() as any;
                return (selection.type === 'timeline' && selection.relatedIds.includes(rectData?.data?.id)) ? "2px" : "0px";
            });

    }, [searchTerm, selection]);

    const handleReset = () => {
        setSearchTerm("");
        if (chartInstanceRef.current && chartInstanceRef.current.resetZoom) {
            chartInstanceRef.current.resetZoom();
        }

        if (chartRef.current) {
            d3.select(chartRef.current).selectAll("rect").style("opacity", 1).style("stroke", "none");
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
                }}
            >
                <input
                    type="text"
                    placeholder="Search functions (e.g. conv2d)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: "1px solid #444",
                        background: "#2a2a2a",
                        color: "#fff",
                        fontSize: "14px",
                        minWidth: "250px",
                        flex: "1 1 250px",
                    }}
                />
                <button
                    onClick={handleReset}
                    style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "1px solid #646cff",
                        background: "#646cff",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                    }}
                >
                    Reset View
                </button>
            </div>

            <div
                ref={chartRef}
                style={{
                    background: "#1e1e1e",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: "pointer",
                    overflow: "hidden",
                    width: "100%",
                }}
            />
        </div>
    );
};

export default Flamegraph;