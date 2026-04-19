# GROF Setup Guide

This guide will help you get the GROF (GPU Radiance and Occupancy Field Profiler) project up and running on your local machine.

## 1. Prerequisites

- **Node.js** (v18+) and **npm**
- **Docker** and **Docker Compose**
- **Python 3.10+** (for backend development outside Docker)

---

## 2. Running the UI (Frontend)

The UI is built with React and Vite. You need to install dependencies before running the development server.

1.  **Navigate to the UI directory:**
    ```bash
    cd ui
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

4.  **Access the UI:**
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 3. Running Backend Services (Docker)

The project uses Docker Compose to manage the database, Redis, and the API.

1.  **Navigate to the root directory:**
    ```bash
    cd /Users/keleman/grof/grof
    ```

2.  **Start the services:**
    ```bash
    docker-compose up -d
    ```

3.  **Check service status:**
    ```bash
    docker-compose ps
    ```

### Available Services:
- **API (FastAPI):** [http://localhost:8000](http://localhost:8000)
- **pgAdmin (Database UI):** [http://localhost:5050](http://localhost:5050)
  - **Email:** `admin@example.com`
  - **Password:** `admin`

---

## 4. Troubleshooting

### `vite: command not found`
This means `npm install` was not run or failed. Make sure you are in the `ui` directory and run `npm install` again.

### Docker connection issues
Ensure Docker Desktop is running before executing `docker-compose up`.
