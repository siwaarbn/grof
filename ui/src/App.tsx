import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import RunDetails from "./pages/RunDetails";
import CompareRuns from "./pages/CompareRuns";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:id" element={<RunDetails />} />
        <Route path="/compare" element={<CompareRuns />} />
      </Routes>
    </BrowserRouter>
  );
}

