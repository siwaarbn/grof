import React from "react";
//import ReactDOM from "react-dom/client";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import RunDetails from "./pages/RunDetails";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/run/:id" element={<RunDetails />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
