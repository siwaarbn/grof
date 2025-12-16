# Week 2: Flamegraph Component Implementation

## Overview

This week I implemented the **interactive Flamegraph component** for the GROF profiler frontend, completing all Week 2 requirements. Additionally, I addressed missing functionality from Week 1 by implementing the Session List table and ensuring full responsive design across all components.

---

## Week 2 

### 1. **Flamegraph Library Integration**
- Integrated **`d3-flame-graph`** library with React
- Configured flamegraph visualization with proper dimensions and transitions
- Set up chart initialization with D3 selections and data binding

### 2. Zoom Functionality

- Click-to-zoom feature enabled (built into d3-flame-graph)
- Implemented "Reset Zoom" button to return to initial view
- Smooth transitions with cubic easing for better UX

### 3. Search Feature

- Created search input field with real-time filtering
- Case-insensitive search that highlights matching frames
- Search works across all function names in the flamegraph hierarchy

### 4. Tooltip on Hover

- Custom tooltip implementation using D3
- Displays full function name and duration (in milliseconds)
- Follows cursor position dynamically
- Styled with dark background, white text, and shadow for readability

### 5. Color Coding Scheme

Implemented semantic color scheme based on execution context:

- 🔴 Python (interpreted/high-level): Warm red
- 🔵 C++/System (compiled/low-level): Cool blue 
- 🟣 CUDA (GPU operations): Purple
- ⚪ Other: Gray


### 6. Legend Component

- Created `FlamegraphLegend.tsx` component
- Visual representation of color scheme with labels
- Helps users understand the context of each stack frame

---

## Week 1 Completion (Previously Missing)

### Dashboard UI: Session List Table

Implemented the missing table component from Week 1 requirements:

- **Columns**: ID, Name, Date, Duration, Status, GPU %, CPU %
- **Mock data**: 6 realistic AI/ML training sessions
- **Interactive rows**: Clickable to navigate to session details 
- **Hover effects**: Visual feedback on row hover
- **Duration formatting**: Human-readable format (e.g., `59m 2s`, `8h 2m 34s`)

---

## Responsive Design Implementation

Ensured all components work seamlessly across different screen sizes:

### Flamegraph Component

- Dynamic width calculation based on container size
- Window resize listener with automatic chart re-rendering
- Prevents horizontal overflow with proper container styling

### Session List Table

- Horizontal scrolling on small screens (`overflow-x: auto`)
- Flexible column widths
- Touch-friendly row heights

### Layout

- CSS Grid for adaptive layouts
- Flexbox for control elements (search bar, buttons)

---

## File Structure

```
src/
├── components/
│   ├── Flamegraph.tsx          # Main flamegraph component with zoom/search/tooltip
│   ├── FlamegraphLegend.tsx    # Color scheme legend
│   ├── SessionList.tsx         # Session table with mock data
│   └── Navbar.tsx              # Navigation bar
├── pages/
│   ├── Dashboard.tsx           # Main dashboard (/)
│   └── RunDetails.tsx          # Session details (/run/:id)
├── data/
│   ├── mockFlamegraphData.ts   # Hierarchical flamegraph mock data
│   └── mockSessions.ts         # Session list mock data
└── main.tsx                    # App entry point with routing
```

---


## Key Achievements

- All Week 2 requirements fully implemented
- Completed missing Week 1 Dashboard UI
---

## Features Demo

### Flamegraph Interactivity

- **Zoom**: Click any frame to zoom in
- **Search**: Type "conv2d" to highlight all matching frames
- **Tooltip**: Hover over any frame to see full details
- **Colors**: Visual distinction between Python (red), C++ (blue), CUDA (purple)

### Session List

- **Navigation**: Click any row to view detailed flamegraph
- **Metrics**: GPU/CPU usage bars with color indicators
- **Status**: Visual badges for session state
