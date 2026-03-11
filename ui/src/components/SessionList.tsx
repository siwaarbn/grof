import type { Session } from "../types/session";

<<<<<<< HEAD
type Props = {
  sessions: Session[];
  selectedSessionIds: number[];
  onToggleSelect: (id: number) => void;
};

=======
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const getStatusStyle = (status: "completed" | "running" | "failed") => {
  switch (status) {
    case "completed":
      return { background: "#2ecc71", color: "#fff" };
    case "running":
      return { background: "#3498db", color: "#fff" };
    case "failed":
      return { background: "#e74c3c", color: "#fff" };
    default:
      return { background: "#95a5a6", color: "#fff" };
  }
};

interface SessionListProps {
  sessions: Session[];
  selectedSessionIds: string[];
  onToggleSelect: (sessionId: string) => void;
}

>>>>>>> frontend
export default function SessionList({
  sessions,
  selectedSessionIds,
  onToggleSelect,
<<<<<<< HEAD
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sessions.map((session) => {
        const checked = selectedSessionIds.includes(session.id);

        return (
          <label
            key={session.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              background: "#1e1e1e",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleSelect(session.id)}
            />
            <span>
              <strong>Session {session.id}</strong> — {session.name}
            </span>
          </label>
        );
      })}
    </div>
=======
}: SessionListProps) {
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
      <h2 style={{ marginTop: 0, marginBottom: "20px" }}>Session List</h2>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ background: "#2a2a2a", textAlign: "left" }}>
              <th style={{ padding: "12px 15px" }}></th>
              <th style={{ padding: "12px 15px" }}>ID</th>
              <th style={{ padding: "12px 15px" }}>Name</th>
              <th style={{ padding: "12px 15px" }}>Date</th>
              <th style={{ padding: "12px 15px" }}>Duration</th>
              <th style={{ padding: "12px 15px" }}>Status</th>
              <th style={{ padding: "12px 15px" }}>GPU %</th>
              <th style={{ padding: "12px 15px" }}>CPU %</th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((session) => {
              const isSelected = selectedSessionIds.includes(session.id);

              return (
                <tr
                  key={session.id}
                  onClick={() => onToggleSelect(session.id)}
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "#2a2a3d" : "transparent",
                    borderLeft: isSelected
                      ? "4px solid #646cff"
                      : "4px solid transparent",
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ padding: "12px 15px" }}>
                    <input type="checkbox" checked={isSelected} readOnly />
                  </td>

                  <td style={{ padding: "12px 15px", color: "#888" }}>
                    {session.id.slice(-3)}
                  </td>

                  <td style={{ padding: "12px 15px", fontWeight: "500" }}>
                    {session.name}
                  </td>

                  <td style={{ padding: "12px 15px", color: "#aaa" }}>
                    {session.date}
                  </td>

                  <td style={{ padding: "12px 15px", fontFamily: "monospace" }}>
                    {formatDuration(session.duration)}
                  </td>

                  <td style={{ padding: "12px 15px" }}>
                    <span
                      style={{
                        ...getStatusStyle(session.status),
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      {session.status}
                    </span>
                  </td>

                  <td style={{ padding: "12px 15px" }}>
                    {session.gpuUsage}%
                  </td>

                  <td style={{ padding: "12px 15px" }}>
                    {session.cpuUsage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
>>>>>>> frontend
  );
}
