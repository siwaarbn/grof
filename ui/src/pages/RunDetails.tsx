import { useParams, useNavigate } from "react-router-dom";
import { mockSessions } from "../data/mockSessions";
import Flamegraph from "../components/Flamegraph";
import FlamegraphLegend from "../components/FlamegraphLegend";
import { mockFlamegraphData } from "../data/mockFlamegraphData";

export default function RunDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const session = mockSessions.find((s) => s.id === id);

    if (!session) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <h1>Session not found</h1>
                <p>Session ID: {id}</p>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        padding: "10px 20px",
                        background: "#646cff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        marginTop: "20px",
                    }}
                >
                    ← Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding:  "20px", width: "100%", boxSizing: "border-box" }}>
            {/* Header */}
            <div style={{ marginBottom: "30px" }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        padding: "8px 16px",
                        background: "transparent",
                        color: "#646cff",
                        border: "1px solid #646cff",
                        borderRadius: "6px",
                        cursor: "pointer",
                        marginBottom: "20px",
                    }}
                >
                    ← Back to Dashboard
                </button>

                <h1 style={{ marginBottom: "10px" }}>{session.name}</h1>
                <p style={{ color:  "#888", margin: 0 }}>
                    Session ID: <code>{session.id}</code> | Date: {session.date}
                </p>
            </div>

            {/* Session Info Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "30px",
                }}
            >
                <div style={{ background: "#1e1e1e", padding:  "20px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#888", fontSize: "14px" }}>Duration</h3>
                    <p style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
                        {Math.floor(session.duration / 60)}m {session.duration % 60}s
                    </p>
                </div>
                <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#888", fontSize: "14px" }}>GPU Usage</h3>
                    <p style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#9b59b6" }}>
                        {session.gpuUsage}%
                    </p>
                </div>
                <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#888", fontSize: "14px" }}>CPU Usage</h3>
                    <p style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#3498db" }}>
                        {session.cpuUsage}%
                    </p>
                </div>
                <div style={{ background: "#1e1e1e", padding:  "20px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#888", fontSize:  "14px" }}>Status</h3>
                    <p style={{ margin: 0, fontSize:  "24px", fontWeight: "600", color: session.status === "completed" ? "#2ecc71" : session.status === "failed" ? "#e74c3c" : "#3498db" }}>
                        {session.status. toUpperCase()}
                    </p>
                </div>
            </div>

            {/* Flamegraph */}
            <section>
                <h2 style={{ marginBottom: "15px" }}>Flamegraph</h2>
                <FlamegraphLegend />
                <Flamegraph data={mockFlamegraphData} height={600} />
            </section>
        </div>
    );
}