from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from typing import Generator
from sqlalchemy.orm import Session
#temporary change
import os
print(">>> DATABASE_URL =", os.getenv("DATABASE_URL"))

DATABASE_URL = os.environ["DATABASE_URL"]
# ↑ force Docker to provide it — fail fast if missing

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
