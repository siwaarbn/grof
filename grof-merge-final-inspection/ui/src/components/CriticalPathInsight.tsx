/**
 * CriticalPathInsight - Summary panel for critical path analysis
 * 
 * Displays key metrics about the critical path:
 * - Total critical path time vs runtime
 * - Parallelism improvement potential
 * - Bottleneck identification
 * - Optimization recommendations
 */

import type { CriticalPath, CriticalPathInsight as InsightType } from "../types/criticalPath";

interface CriticalPathInsightProps {
    criticalPath: CriticalPath;
    insight?: InsightType;
}

const CriticalPathInsight = ({ criticalPath, insight }: CriticalPathInsightProps) => {
    const { totalPathTime, totalRuntime, parallelismGap, utilizationPercent } = criticalPath;

    return (
        <div
            style={{
                background: "linear-gradient(135deg, rgba(231, 76, 60, 0.12), rgba(231, 76, 60, 0.04))",
                border: "1px solid rgba(231, 76, 60, 0.3)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <span style={{ width: "12px", height: "12px", background: "#e74c3c", borderRadius: "2px", display: "inline-block" }} />
                <h3 style={{ margin: 0, color: "#e74c3c", fontSize: "16px", fontWeight: "600" }}>
                    Critical Path Analysis
                </h3>
            </div>

            {/* Metrics Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                }}
            >
                {/* Critical Path Time */}
                <div
                    style={{
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                    }}
                >
                    <div style={{ color: "#888", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>
                        Critical Path
                    </div>
                    <div style={{ color: "#e74c3c", fontSize: "24px", fontWeight: "700" }}>
                        {totalPathTime}ms
                    </div>
                </div>

                {/* Total Runtime */}
                <div
                    style={{
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                    }}
                >
                    <div style={{ color: "#888", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>
                        Total Runtime
                    </div>
                    <div style={{ color: "#fff", fontSize: "24px", fontWeight: "700" }}>
                        {totalRuntime}ms
                    </div>
                </div>

                {/* Parallelism Gap */}
                <div
                    style={{
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                    }}
                >
                    <div style={{ color: "#888", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>
                        Potential Savings
                    </div>
                    <div style={{ color: "#2ecc71", fontSize: "24px", fontWeight: "700" }}>
                        {parallelismGap}ms
                    </div>
                </div>

                {/* GPU Utilization */}
                <div
                    style={{
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                    }}
                >
                    <div style={{ color: "#888", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>
                        Path Efficiency
                    </div>
                    <div style={{ color: "#3498db", fontSize: "24px", fontWeight: "700" }}>
                        {utilizationPercent}%
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#888", fontSize: "12px" }}>Critical Path vs Runtime</span>
                    <span style={{ color: "#888", fontSize: "12px" }}>{utilizationPercent}%</span>
                </div>
                <div
                    style={{
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "4px",
                        height: "8px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            background: "linear-gradient(90deg, #e74c3c, #c0392b)",
                            width: `${utilizationPercent}%`,
                            height: "100%",
                            borderRadius: "4px",
                            transition: "width 0.5s ease",
                        }}
                    />
                </div>
            </div>

            {/* Bottleneck & Recommendation */}
            {insight && (
                <div
                    style={{
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        padding: "12px",
                    }}
                >
                    <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: "#f39c12", fontWeight: "600", fontSize: "13px" }}>Bottleneck: </span>
                        <span style={{ color: "#fff", fontSize: "13px" }}>
                            {insight.bottleneckName} ({insight.bottleneckDuration}ms)
                        </span>
                    </div>
                    <p style={{ color: "#aaa", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
                        {insight.recommendation}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CriticalPathInsight;
