<<<<<<< HEAD
import './App.css';

function App() {
  return (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        color: "white",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
        GROF Dashboard
      </h1>

      <p style={{ fontSize: "1.4rem" }}>
        ✔ Frontend successfully initialized  
      </p>

      
    </div>
  );
}

export default App;
=======
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
>>>>>>> frontend
