/**
 * CriticalPathToggle - Toggle button to show/hide critical path overlay
 * 
 * A simple switch component with visual feedback for critical path state.
 */

interface CriticalPathToggleProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    criticalEventCount?: number;
}

const CriticalPathToggle = ({ enabled, onToggle, criticalEventCount }: CriticalPathToggleProps) => {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                background: enabled
                    ? "linear-gradient(135deg, rgba(231, 76, 60, 0.15), rgba(231, 76, 60, 0.05))"
                    : "rgba(255,255,255,0.05)",
                border: enabled ? "1px solid rgba(231, 76, 60, 0.4)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                transition: "all 0.3s ease",
            }}
        >
            {/* Label */}
            <span style={{ color: enabled ? "#e74c3c" : "#888", fontSize: "13px", fontWeight: "500" }}>
                Critical Path
            </span>

            {/* Toggle Switch */}
            <button
                onClick={() => onToggle(!enabled)}
                style={{
                    position: "relative",
                    width: "44px",
                    height: "24px",
                    background: enabled ? "#e74c3c" : "#444",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                    padding: 0,
                }}
            >
                <span
                    style={{
                        position: "absolute",
                        top: "2px",
                        left: enabled ? "22px" : "2px",
                        width: "20px",
                        height: "20px",
                        background: "#fff",
                        borderRadius: "50%",
                        transition: "left 0.3s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                />
            </button>

            {/* Event Count Badge */}
            {enabled && criticalEventCount !== undefined && (
                <span
                    style={{
                        background: "#e74c3c",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "10px",
                    }}
                >
                    {criticalEventCount} events
                </span>
            )}
        </div>
    );
};

export default CriticalPathToggle;
