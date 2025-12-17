GROF – Week 1 Frontend Work

-->Summary

This week I set up the basic structure of the frontend for the GROF project.
The goal was not to build the final UI but to prepare a clear, organized foundation that we can extend in the next weeks.

-->Work Completed
1. Project Setup

Created a new React project using Vite.

Installed the necessary packages (React, React Router, TypeScript, etc.).

Cleaned the default template and prepared the folder structure.

2. Basic UI Structure

I added a simple layout with:

A Dashboard page

Placeholder components for the future visualizations

Nothing is connected to the backend yet — the purpose was only to have a shape and structure for the app.

3. Components Created

The following components were created with mock data so we can later replace them with real API calls:

SessionList

GpuEventList

CpuSampleList

TimelinePlaceholder

FlamegraphPlaceholder

These only show fake/static content for now, but the architecture is ready for real data.

4. Routing

Added simple routing so that the app can support multiple views later:

/ → Dashboard

Tech Stack Used

React (with Vite)

TypeScript

React Router

Basic CSS 


-->Folder Structure: 
ui/
 ├── src/
 │    ├── components/
 │    ├── pages/
 │    ├── App.tsx
 │    └── main.tsx
 ├── package.json
 └── README.md


-->How to Run

Inside the ui/ folder:

npm install
npm run dev


Then open:

http://localhost:5173



-->Notes for Next Weeks

Replace mock data with real backend API calls

Start integrating visualizations (e.g., Flamegraph, Timeline)

Improve the dashboard layout

Add state management if needed (Zustand/Redux)


**FRONTEND REPORT – Week 4**

Objective of the Week

The goal for Week 4 was to integrate the frontend with the real backend API, replace mock navigation with real routing, and enable session-based navigation from the dashboard to detailed run views.

Deliverables
1. Real Backend API Integration

The frontend was connected to the FastAPI backend using Axios.
A centralized API client was created to handle all HTTP requests and ensure consistency.

Replaced mock data with live backend data

Integrated real API endpoints exposed by the backend

Verified end-to-end data flow from database → backend → frontend

2. Application Routing & Navigation

Client-side routing was implemented using react-router to enable navigation between views:

/ → Dashboard view (list of sessions)

/run/:id → Session detail view

Each session row in the dashboard is clickable and routes dynamically to the corresponding session detail page.

3. Dashboard (Session List)

The dashboard displays profiling sessions in a structured table including:

Session ID

Name

Date

Duration

Status

CPU and GPU usage indicators

This view now serves as the main entry point for exploring profiling runs.

4. Session Detail View

A dedicated run detail page was implemented and connected to routing:

Displays session metadata (ID, date, duration, status)

Shows CPU and GPU usage summaries

Provides navigation back to the dashboard

Prepares layout sections for advanced visualizations

This page is designed to receive real profiling data per session.

5. UI Prepared for Visualization Components

The frontend structure was prepared for advanced visualizations:

Flamegraph container section

Legend for CPU / GPU / System categories

Search input for function lookup

Zoom and reset controls

While full rendering will be implemented in later milestones, the UI architecture is ready for integration.

Outcome of Week 4

Frontend fully connected to the backend API

Real session-based navigation implemented

Mock data removed from the UI

Dashboard and run detail views operational

Frontend prepared for CPU flamegraphs and GPU timelines