import { useEffect, useRef, useState, useContext } from "react";
import { flamegraph } from "d3-flame-graph";
import "d3-flame-graph/dist/d3-flamegraph.css";
import * as d3 from "d3";
import { CorrelationContext } from "../context/CorrelationContext";
import type { FlamegraphNode } from "../types/flamegraph";

interface FlamegraphProps {
    data: FlamegraphNode;
    width?: number;
    height?: number;
}

// Safe hook: returns a dummy state when used outside CorrelationProvider (e.g. Dashboard preview)
function useSafeCorrelation() {
    const ctx = useContext(CorrelationContext);
    if (!ctx) {
        return { selection: { type: null, nodeId: null, relatedIds: [] } };
    }
    return ctx.state;
}

const Flamegraph = ({ data, width, height = 600 }: FlamegraphProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<any>(null);
    const chartInstanceRef = useRef<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [chartWidth, setChartWidth] = useState(0);

    const { selection } = useSafeCorrelation();

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const w = containerRef.current.offsetWidth;
                setChartWidth(w > 0 ? w : 1200);
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
                const rectData = d3.select(this).datum() as any;
                if (rectData?.data) {
                    tooltip
                        .html(`<strong>${rectData.data.name}</strong><br/>Time: ${rectData.data.value}ms`)
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

    // Search + Correlation highlight
    useEffect(() => {
        if (!chartRef.current) return;

        d3.select(chartRef.current)
            .selectAll("rect")
            .style("opacity", function () {
                const rectData = d3.select(this).datum() as any;
                const name = rectData?.data?.name || "";
                const nodeId = rectData?.data?.id;

                const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());

                let matchesCorrelation = true;
                if (selection.type === "timeline" && selection.relatedIds.length > 0) {
                    matchesCorrelation = selection.relatedIds.includes(nodeId);
                }

                return matchesSearch && matchesCorrelation ? 1 : 0.2;
            })
            .style("stroke", function () {
                const rectData = d3.select(this).datum() as any;
                if (selection.type === "timeline" && selection.relatedIds.includes(rectData?.data?.id)) {
                    return "#ffd700";
                }
                return "none";
            })
            .style("stroke-width", function () {
                const rectData = d3.select(this).datum() as any;
                return selection.type === "timeline" && selection.relatedIds.includes(rectData?.data?.id)
                    ? "2px"
                    : "0px";
            });
    }, [searchTerm, selection]);

    const handleReset = () => {
        setSearchTerm("");
        if (chartInstanceRef.current?.resetZoom) {
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

            <div
                ref={chartRef}
                style={{
                    background: "transparent",
                    borderRadius: "8px",
                    cursor: "pointer",
                    overflow: "hidden",
                    width: "100%",
                }}
            />
        </div>
    );
};

export default Flamegraph;
