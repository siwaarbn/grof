import type { SessionMetrics } from "../types/comparison";

type Props = {
  metrics: SessionMetrics;
};

export default function KernelAnalysisTable({ metrics }: Props) {
  const kernels = metrics.gpuKernels;

  if (!kernels || kernels.length === 0) {
    return (
      <p style={{ color: "#777", fontSize: 13 }}>
        No kernel-level metrics available.
      </p>
    );
  }

  return (
    <section
      style={{
        background: "#1e1e1e",
        borderRadius: 8,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginBottom: 12 }}>Kernel Analysis</h3>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#aaa" }}>
            <th style={th}>Kernel</th>
            <th style={th}>Duration (ms)</th>
            <th style={th}>SM Utilization</th>
            <th style={th}>Recommendation</th>
          </tr>
        </thead>

        <tbody>
          {kernels.map((kernel, i) => {
            const sm = kernel.smUtilization;
            const lowUtil = sm !== undefined && sm < 40;

            return (
              <tr key={i}>
                <td style={td}>{kernel.name}</td>
                <td style={td}>{kernel.durationMs.toFixed(2)}</td>

                <td style={td}>
                  {sm === undefined ? (
                    <span style={{ color: "#777" }}>N/A</span>
                  ) : (
                    <span
                      style={{
                        color: lowUtil ? "#e74c3c" : "#2ecc71",
                        fontWeight: 600,
                      }}
                    >
                      {sm.toFixed(1)}%
                    </span>
                  )}
                </td>

                <td style={td}>
                  {lowUtil ? (
                    <span style={{ color: "#f1c40f" }}>
                      Increase batch size or grid dimensions
                    </span>
                  ) : (
                    <span style={{ color: "#777" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ================= STYLES ================= */

const th: React.CSSProperties = {
  paddingBottom: 8,
  borderBottom: "1px solid #333",
};

const td: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid #333",
};
