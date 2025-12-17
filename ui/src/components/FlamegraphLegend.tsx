import React from "react";

const FlamegraphLegend = () => {
    const legendItems = [
        { color:  "#e74c3c", label: "Python" },
        { color: "#3498db", label: "C++/System" },
        { color: "#9b59b6", label: "CUDA" },
        { color: "#95a5a6", label:  "Other" },
    ];

    return (
        <div
            style={{
                display: "flex",
                gap: "20px",
                padding: "15px",
                background: "#2a2a2a",
                borderRadius: "8px",
                marginBottom: "15px",
                flexWrap: "wrap",
            }}
        >
            <span style={{ fontWeight: "600", color: "#fff" }}>Legend:</span>
            {legendItems.map((item) => (
                <div
                    key={item.label}
                    style={{ display: "flex", alignItems:  "center", gap: "8px" }}
                >
                    <div
                        style={{
                            width: "20px",
                            height: "20px",
                            background: item.color,
                            borderRadius: "4px",
                        }}
                    />
                    <span style={{ color: "#fff", fontSize: "14px" }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export default FlamegraphLegend;