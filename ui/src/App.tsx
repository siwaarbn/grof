import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import CompareRuns from "./pages/CompareRuns";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/compare" element={<CompareRuns />} />
    </Routes>
  );
}
