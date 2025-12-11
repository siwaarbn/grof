import SessionList from "../components/SessionList";
import CpuSampleList from "../components/CpuSampleList";
import GpuEventList from "../components/GpuEventList";
import TimelinePlaceholder from "../components/TimelinePlaceholder";
import FlamegraphPlaceholder from "../components/FlamegraphPlaceholder";

export default function Dashboard() {
  return (
    <div style={{ padding: 20 }}>
      <h1>GROF Dashboard</h1>

      <div style={{ display: "grid", gap: 20 }}>
        <SessionList />
        <CpuSampleList />
        <GpuEventList />
        <TimelinePlaceholder />
        <FlamegraphPlaceholder />
      </div>
    </div>
  );
}

