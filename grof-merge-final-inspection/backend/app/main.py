from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base

from app.routers.sessions import router as sessions_router
from app.routers.cpu_correlation import router as cpu_correlation_router
from app.routers.time_sync import router as time_sync_router
from app.routers.correlated_events import router as correlated_events_router
from app.routers.critical_path import router as critical_path_router
from app.routers.gpu_events import router as gpu_events_router
from app.routers.functions import router as functions_router
from app.routers.timeline import router as timeline_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GROF API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router, prefix="/api/v1")
app.include_router(cpu_correlation_router, prefix="/api/v1")
app.include_router(time_sync_router, prefix="/api/v1")
app.include_router(correlated_events_router, prefix="/api/v1")
app.include_router(critical_path_router, prefix="/api/v1")
app.include_router(gpu_events_router, prefix="/api/v1")
app.include_router(functions_router, prefix="/api/v1")
app.include_router(timeline_router, prefix="/api/v1")