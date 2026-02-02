from fastapi import FastAPI

from app.routers.sessions import router as sessions_router
from app.routers.cpu_correlation import router as cpu_correlation_router
from app.routers.time_sync import router as time_sync_router
from app.routers.correlated_events import router as correlated_events_router
from app.routers.critical_path import router as critical_path_router




app = FastAPI()

app.include_router(sessions_router)
app.include_router(cpu_correlation_router)
app.include_router(time_sync_router)
app.include_router(correlated_events_router)
app.include_router(critical_path_router)
app.include_router(sessions_router, prefix="/api/v1")