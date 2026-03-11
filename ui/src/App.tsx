import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import RunDetails from "./pages/RunDetails";
import CorrelatedRunDetails from "./pages/CorrelatedRunDetails";
import CompareRuns from "./pages/CompareRuns";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:id" element={<RunDetails />} />
        <Route path="/session/:id/correlated" element={<CorrelatedRunDetails />} />
        <Route path="/compare" element={<CompareRuns />} />
      </Routes>
    </BrowserRouter>
  );
}
