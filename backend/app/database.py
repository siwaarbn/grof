from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
<<<<<<< HEAD
from typing import Generator
from sqlalchemy.orm import Session
import os
import sys

# HARDCODE THE CORRECT URL - This will override any environment variable
DATABASE_URL = "postgresql+psycopg2://admin:admin@db:5432/grof"

# Print to stderr so we can see it in Docker logs
print(f"=== USING CORRECT DATABASE_URL ===", file=sys.stderr)
print(f"{DATABASE_URL}", file=sys.stderr)

# Create engine with the hardcoded correct URL
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from app.models import *
=======
import os

# Read DATABASE_URL from environment variables (docker-compose sets this)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/grof")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
>>>>>>> frontend
