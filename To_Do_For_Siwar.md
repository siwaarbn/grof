# To-Do for Siwar — Week 4: Real API Integration

**Reference:** M1/T5.md Week 4  
**Goal:** Stop using mock data. Connect frontend to real Backend API.

---

## Week 4 Requirements from T5.md

> 1. **Connect to T4:** Stop using mock data. Fetch the list of sessions from `http://localhost:8000/sessions`.
> 2. **Fetch Trace:** When clicking a session, fetch the flamegraph JSON from `http://localhost:8000/sessions/{id}/flamegraph`.
> 3. **Loading States:** Handle network latency (Spinners/Skeletons).
> 4. **Docker:** Create a `Dockerfile` for the frontend (Nginx serving the build).

---

## 1. Sessions API

**Endpoint:** `GET /sessions`  
**Backend Status:** ❓ Needs verification

**Expected Response:**
```json
[
  {
    "id": "session-001",
    "name": "ResNet50 Training",
    "date": "2025-12-16 09:30:00",
    "duration": 3542,
    "status": "completed"
  }
]
```

**Frontend Ready:** Yes (`ui/src/api/sessions.ts` already calls this endpoint)

**Action Required:**
- Verify backend implements this endpoint
- Confirm response matches the expected format

---

## 2. Flamegraph API

**Endpoint:** `GET /sessions/{id}/flamegraph`  
**Backend Status:** ⚠️ Not implemented

**Expected Response:**
```json
{
  "name": "root",
  "value": 100,
  "children": [
    {
      "name": "train_epoch [Python]",
      "value": 95,
      "children": [...]
    }
  ]
}
```

**Frontend Ready:** No — currently uses hardcoded `correlatedFlamegraphData.ts`

**Action Required:**
1. Backend: Implement endpoint returning flamegraph data from CPU samples
2. Frontend: Create `fetchFlamegraph(sessionId)` function in `ui/src/api/`
3. Frontend: Update `CorrelatedFlamegraph.tsx` to fetch on mount

---

## 3. Loading States

**Backend Status:** N/A (frontend-only task)  
**Frontend Status:** ⚠️ Not implemented

**Action Required:**
1. Add loading spinner while fetching data
2. Show skeleton UI during API calls
3. Display error message if API fails

**Example Implementation:**
```tsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
```

---

## 4. Docker Configuration

**Status:** ⚠️ Not implemented

**Files to Create:**

### `ui/Dockerfile`
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `ui/nginx.conf`
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://backend:8000;
    }
}
```

---

## 5. Summary Checklist

| Task | Owner | Status |
|------|-------|--------|
| Verify `/sessions` endpoint | Backend | ⬜ |
| Implement `/sessions/{id}/flamegraph` | Backend | ⬜ |
| Add loading spinners | Frontend | ⬜ |
| Add error handling | Frontend | ⬜ |
| Create Dockerfile | Frontend | ⬜ |
| Create nginx.conf | Frontend | ⬜ |
| Test end-to-end with real API | Both | ⬜ |

---

## 6. How to Connect M2 After API is Ready

Once the APIs above are implemented, the M2 Correlation View will need these **additional** endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /sessions/{id}/gpu-events` | GPU timeline events |
| `GET /sessions/{id}/critical-path` | Critical path analysis |

These are **not part of Week 4** but will be needed to fully integrate M2 with real data.
