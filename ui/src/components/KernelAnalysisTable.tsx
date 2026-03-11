import type { GpuKernelMetric } from "../types/comparison";

interface Props {
  kernels: GpuKernelMetric[];
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px" };
const td: React.CSSProperties = { padding: "6px 10px" };

export default function KernelAnalysisTable({ kernels }: Props) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={th}>Kernel</th>
          <th style={th}>Calls</th>
          <th style={th}>Total Time (ms)</th>
          <th style={th}>SM Efficiency</th>
          <th style={th}>DRAM Utilization</th>
        </tr>
      </thead>

      <tbody>
        {kernels.map((kernel) => (
          <tr key={kernel.name}>
            <td style={td}>{kernel.name}</td>
            <td style={td}>{kernel.count}</td>
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
  );
}
