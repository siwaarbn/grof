import React from "react";
//import ReactDOM from "react-dom/client";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import CorrelatedRunDetails from "./pages/CorrelatedRunDetails";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/run/:id" element={<CorrelatedRunDetails />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
