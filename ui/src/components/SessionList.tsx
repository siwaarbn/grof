import type { Session } from "../types/session";

type Props = {
  sessions: Session[];
  selectedSessionIds: number[];
  onToggleSelect: (id: number) => void;
};

export default function SessionList({
  sessions,
  selectedSessionIds,
  onToggleSelect,
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
  );
}
