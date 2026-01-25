import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchSessions } from "./api/sessions";
import { fetchCpuSamples } from "./api/cpuSamples";
import type { Session } from "./types/session";
import CorrelatedRunDetails from "./pages/CorrelatedRunDetails";

function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  async function handleSessionClick(id: number) {
    try {
      const samples = await fetchCpuSamples(id);
      console.log("CPU samples for session", id, samples);
      alert(`Fetched ${samples.length} CPU samples (see console)`);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch CPU samples");
    }
  }

  if (loading) {
    return <p>Loading sessions...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>GROF Sessions</h1>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Start Time</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr
              key={s.id}
              onClick={() => handleSessionClick(s.id)}
              style={{ cursor: "pointer" }}
            >
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.start_time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/run/:id" element={<CorrelatedRunDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

