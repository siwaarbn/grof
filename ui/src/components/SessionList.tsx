import { useNavigate } from "react-router-dom";
import { mockSessions } from "../data/mockSessions";


const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
};

const getStatusStyle = (status: "completed" | "running" | "failed") => {
    switch (status) {
        case "completed":
            return { background:  "#2ecc71", color:  "#fff" };
        case "running":
            return { background: "#3498db", color:  "#fff" };
        case "failed":
            return { background: "#e74c3c", color: "#fff" };
        default:
            return { background:  "#95a5a6", color: "#fff" };
    }
};

export default function SessionList() {
    const navigate = useNavigate();

    const handleRowClick = (sessionId: string) => {
        navigate(`/run/${sessionId}`);
    };

    return (
        <section
            style={{
                background: "#1e1e1e",
                borderRadius: "8px",
                padding: "20px",
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            <h2 style={{ marginTop: 0, marginBottom: "20px" }}> Session List</h2>

            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px",
                    }}
                >
                    <thead>
                    <tr
                        style={{
                            background: "#2a2a2a",
                            textAlign: "left",
                        }}
                    >
                        <th style={{ padding: "12px 15px", borderBottom: "2px solid #444" }}>ID</th>
                        <th style={{ padding: "12px 15px", borderBottom: "2px solid #444" }}>Name</th>
                        <th style={{ padding: "12px 15px", borderBottom: "2px solid #444" }}>Date</th>
                        <th style={{ padding: "12px 15px", borderBottom: "2px solid #444" }}>Duration</th>
                        <th style={{ padding:  "12px 15px", borderBottom: "2px solid #444" }}>Status</th>
                        <th style={{ padding: "12px 15px", borderBottom: "2px solid #444" }}>GPU %</th>
                        <th style={{ padding: "12px 15px", borderBottom: "2px solid #444" }}>CPU %</th>
                    </tr>
                    </thead>
                    <tbody>
                    {mockSessions.map((session) => (
                        <tr
                            key={session.id}
                            onClick={() => handleRowClick(session.id)}
                            style={{
                                cursor: "pointer",
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#333";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <td
                                style={{
                                    padding: "12px 15px",
                                    borderBottom: "1px solid #333",
                                    fontFamily: "monospace",
                                    color: "#888",
                                }}
                            >
                                {session.id. slice(-3)}
                            </td>
                            <td
                                style={{
                                    padding: "12px 15px",
                                    borderBottom: "1px solid #333",
                                    fontWeight: "500",
                                }}
                            >
                                {session.name}
                            </td>
                            <td
                                style={{
                                    padding: "12px 15px",
                                    borderBottom:  "1px solid #333",
                                    color: "#aaa",
                                }}
                            >
                                {session.date}
                            </td>
                            <td
                                style={{
                                    padding: "12px 15px",
                                    borderBottom: "1px solid #333",
                                    fontFamily: "monospace",
                                }}
                            >
                                {formatDuration(session.duration)}
                            </td>
                            <td style={{ padding: "12px 15px", borderBottom: "1px solid #333" }}>
                  <span
                      style={{
                          ... getStatusStyle(session.status),
                          padding: "4px 10px",
                          borderRadius:  "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                      }}
                  >
                    {session.status}
                  </span>
                            </td>
                            <td
                                style={{
                                    padding: "12px 15px",
                                    borderBottom: "1px solid #333",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div
                                        style={{
                                            width: "60px",
                                            height: "8px",
                                            background: "#333",
                                            borderRadius: "4px",
                                            overflow:  "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${session.gpuUsage}%`,
                                                height: "100%",
                                                background: session.gpuUsage > 80 ? "#e74c3c" : "#2ecc71",
                                                borderRadius: "4px",
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: "12px", color: "#aaa" }}>{session.gpuUsage}%</span>
                                </div>
                            </td>
                            <td
                                style={{
                                    padding: "12px 15px",
                                    borderBottom: "1px solid #333",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div
                                        style={{
                                            width: "60px",
                                            height: "8px",
                                            background: "#333",
                                            borderRadius: "4px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${session.cpuUsage}%`,
                                                height: "100%",
                                                background:  session.cpuUsage > 80 ? "#e74c3c" : "#3498db",
                                                borderRadius: "4px",
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: "12px", color: "#aaa" }}>{session.cpuUsage}%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
