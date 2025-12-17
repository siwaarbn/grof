from fastapi import FastAPI
from app.routers import sessions

app = FastAPI()

app.include_router(sessions.router)
