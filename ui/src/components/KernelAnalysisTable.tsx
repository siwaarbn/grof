import type { GpuKernelMetric } from "../types/comparison";

interface Props {
  kernels: GpuKernelMetric[];
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px" };
const td: React.CSSProperties = { padding: "6px 10px" };

function truncateKernelName(name: string, max = 55): string {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

export default function KernelAnalysisTable({ kernels }: Props) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2D313A" }}>
          <th style={th}>Kernel</th>
          <th style={th}>Calls</th>
          <th style={th}>Total Time (ms)</th>
          <th style={th}>SM Efficiency</th>
          <th style={th}>DRAM Utilization</th>
        </tr>
      </thead>

      <tbody>
        {kernels.map((kernel) => (
          <tr key={kernel.name} style={{ borderBottom: "1px solid #2D313A" }}>
            <td
              style={{ ...td, width: "40%", color: "#E2E8F0" }}
              title={kernel.name}
            >
              <span style={{ cursor: "default", fontFamily: "inherit", fontSize: 12 }}>
                {truncateKernelName(kernel.name)}
              </span>
            </td>
            <td style={{...td, width: "15%", color: "#94A3B8"}}>{kernel.count}</td>
            <td style={td}>{kernel.totalTimeMs.toFixed(2)}</td>

            <td style={td}>
              {kernel.smEfficiency !== undefined
                ? `${kernel.smEfficiency.toFixed(1)} %`
                : "—"}
            </td>

            <td style={td}>
              {kernel.dramUtilization !== undefined
                ? `${kernel.dramUtilization.toFixed(1)} %`
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
