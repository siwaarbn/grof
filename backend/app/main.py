from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base  # IMPORTANT: imports all models

from app.routers.sessions import router as sessions_router
from app.routers.cpu_correlation import router as cpu_correlation_router
from app.routers.time_sync import router as time_sync_router
from app.routers.correlated_events import router as correlated_events_router
from app.routers.critical_path import router as critical_path_router

# --------------------
# Create tables
# --------------------
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GROF API")

# --------------------
# CORS (allow all for dev)
# --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# Routers
# --------------------
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(cpu_correlation_router, prefix="/api/v1")
app.include_router(time_sync_router, prefix="/api/v1")
app.include_router(correlated_events_router, prefix="/api/v1")
app.include_router(critical_path_router, prefix="/api/v1")
