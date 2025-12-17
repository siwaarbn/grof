import SessionList from "../components/SessionList";
import CpuSampleList from "../components/CpuSampleList";
import GpuEventList from "../components/GpuEventList";
//import TimelinePlaceholder from "../components/TimelinePlaceholder";
//import FlamegraphPlaceholder from "../components/FlamegraphPlaceholder";
import Flamegraph from "../components/Flamegraph";
import FlamegraphLegend from "../components/FlamegraphLegend";
import Timeline from "../components/Timeline";
import { mockFlamegraphData } from "../data/mockFlamegraphData";
import { mockGpuEvents } from "../data/mockGpuEvents";

export default function Dashboard() {
  return (
      <div
          style={{
              padding: "20px",
              width: "100%",
              boxSizing: "border-box",
          }}
      >
        <h1 style={{ marginBottom: "30px" }}>GROF Dashboard</h1>

      <div style={{ display: "grid", gap: "30px", width: "100%" }}>
        <SessionList />
        <CpuSampleList />
        <GpuEventList />
          <section>
              <h2 style={{ marginBottom: "15px" }}>GPU Timeline</h2>
              <Timeline events={mockGpuEvents} height={400} />
          </section>

          <section>
              <h2 style={{ marginBottom: "15px" }} >Flamegraph </h2>
              <FlamegraphLegend />
              <Flamegraph
                  data={mockFlamegraphData}
                  height={600}
              />
          </section>
      </div>
    </div>
  );
}

