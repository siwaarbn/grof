// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { flamegraph } from "d3-flame-graph";
import "d3-flame-graph/dist/d3-flamegraph.css";
import * as d3 from "d3";

interface FlamegraphProps {
    data: any;
    width?:  number;
    height?: number;
}

const Flamegraph = ({ data, width, height = 600 }: FlamegraphProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<any>(null);
    const chartInstanceRef = useRef<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [chartWidth, setChartWidth] = useState(width || 1200);

    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current) {
                const containerWidth = chartRef.current.parentElement?.clientWidth || 1200;
                setChartWidth(containerWidth - 20); // Минус padding
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!chartRef.current || !data) return;

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
                // WARM colors for Python (interpreted/high-level)
                if (name.includes("[Python]")) return "#e74c3c"; // Red/Warm
                // COOL colors for C++/System (compiled/low-level)
                if (name.includes("[C++]")) return "#3498db";    // Blue/Cool
                if (name.includes("[CUDA]")) return "#9b59b6";   // Purple (GPU)
                return "#95a5a6";  // Gray (Other)
            });

        chartInstanceRef.current = chart;

        const chartContainer = d3.select(chartRef.current);
        chartContainer.datum(data).call(chart as any);

        if (! tooltipRef.current) {
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
            .on("mouseover", function (event:  any) {
                const rect = d3.select(this);
                const rectData = rect.datum() as any;

                if (rectData?. data) {
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
                    .style("left", event. pageX + 10 + "px");
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
    }, [data, width, height]);

    useEffect(() => {
        if (!chartRef.current) return;

        if (! searchTerm) {
            d3.select(chartRef.current).selectAll("rect").style("opacity", 1);
            return;
        }

        d3.select(chartRef.current)
            .selectAll("rect")
            .style("opacity", function () {
                const rectData = d3.select(this).datum() as any;
                const name = rectData?.data?.name || "";
                return name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0.3;
            });
    }, [searchTerm]);

    const handleReset = () => {
        setSearchTerm("");
        // Используем встроенный метод resetZoom()
        if (chartInstanceRef. current && chartInstanceRef.current.resetZoom) {
            chartInstanceRef.current.resetZoom();
        }

        if (chartRef.current) {
            d3.select(chartRef.current).selectAll("rect").style("opacity", 1);
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {/* Controls */}
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "15px",
                    flexWrap:  "wrap",
                    alignItems: "center",
                }}
            >
                <input
                    type="text"
                    placeholder="Search functions..."
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
                        flex: "1",
                    }}
                />
                <button
                    onClick={handleReset}
                    style={{
                        padding: "8px 16px",
                        borderRadius:  "4px",
                        border:  "1px solid #646cff",
                        background: "#646cff",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize:  "14px",
                        fontWeight: "500",
                    }}
                >
                    Reset Zoom
                </button>
            </div>

            {/* Flamegraph */}
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