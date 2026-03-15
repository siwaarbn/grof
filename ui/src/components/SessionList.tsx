import type { Session } from "../types/session";

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const getStatusStyle = (status: "completed" | "running" | "failed" | string) => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "completed":
      return { background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.3)" };
    case "running":
      return { background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", border: "1px solid rgba(99, 102, 241, 0.3)" };
    case "failed":
      return { background: "rgba(244, 63, 94, 0.15)", color: "#F43F5E", border: "1px solid rgba(244, 63, 94, 0.3)" };
    default:
      return { background: "rgba(148, 163, 184, 0.15)", color: "#94A3B8", border: "1px solid rgba(148, 163, 184, 0.3)" };
  }
};

interface SessionListProps {
  sessions: Session[];
  selectedSessionIds: string[];
  onToggleSelect: (sessionId: string) => void;
}

export default function SessionList({
  sessions,
  selectedSessionIds,
  onToggleSelect,
}: SessionListProps) {
  return (
    <section
      style={{
        background: "#13151A",
        border: "1px solid #262933",
        borderRadius: "12px",
        width: "100%",
        boxSizing: "border-box",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        overflow: "hidden"
      }}
    >
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #262933", background: "rgba(255,255,255,0.02)" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#F8FAFC" }}>Session Registry</h3>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ background: "#090A0C", textAlign: "left" }}>
              <th style={{ padding: "14px 24px", width: 40 }}></th>
              <th style={{ padding: "14px 16px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>ID</th>
              <th style={{ padding: "14px 16px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>Name</th>
              <th style={{ padding: "14px 16px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>Date</th>
              <th style={{ padding: "14px 16px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>Duration</th>
              <th style={{ padding: "14px 16px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>Status</th>
              <th style={{ padding: "14px 16px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>GPU %</th>
              <th style={{ padding: "14px 24px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: 11 }}>CPU %</th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((session, i) => {
              const isSelected = selectedSessionIds.includes(session.id);
              const isLast = i === sessions.length - 1;

              return (
                <tr
                  key={session.id}
                  onClick={() => onToggleSelect(session.id)}
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "rgba(99, 102, 241, 0.08)" : "transparent",
                    borderBottom: isLast ? "none" : "1px solid #262933",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#1A1D24"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Checkbox */}
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{
                      width: 18, height: 18, border: `2px solid ${isSelected ? "#6366F1" : "#475569"}`, 
                      borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                      background: isSelected ? "#6366F1" : "transparent", transition: "all 0.2s"
                    }}>
                      {isSelected && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                    </div>
                  </td>

                  <td style={{ padding: "16px 16px", color: "#94A3B8", fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace' }}>
                    #{session.id.slice(-4)}
                  </td>

                  <td style={{ padding: "16px 16px", fontWeight: "500", color: "#F8FAFC" }}>
                    {session.name}
                  </td>

                  <td style={{ padding: "16px 16px", color: "#cbd5e1", fontSize: 13 }}>
                    {session.date}
                  </td>

                  <td style={{ padding: "16px 16px", fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', color: "#cbd5e1", fontSize: 13 }}>
                    {formatDuration(session.duration)}
                  </td>

                  <td style={{ padding: "16px 16px" }}>
                    <span
                      style={{
                        ...getStatusStyle(session.status),
                        padding: "4px 10px",
                        borderRadius: "16px",
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {session.status}
                    </span>
                  </td>

                  <td style={{ padding: "16px 16px", fontFamily: 'SFMono-Regular, Consolas, monospace', color: "#cbd5e1" }}>
                    {session.gpuUsage}%
                  </td>

                  <td style={{ padding: "16px 24px", fontFamily: 'SFMono-Regular, Consolas, monospace', color: "#cbd5e1" }}>
                    {session.cpuUsage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
