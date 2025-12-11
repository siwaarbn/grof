GROF – Week 2 Backend Work
Summary

This week I focused on setting up the backend foundation for the GROF project.
The goal was to prepare a fully working environment with:

a PostgreSQL database running in Docker

an API container (FastAPI + SQLAlchemy)

the complete database schema

automatic migrations using Alembic

By the end of the week, the backend was running successfully with all tables created and the system ready for data ingestion in future weeks.

Work Completed
1. Dockerized Backend Environment

I set up a complete Docker environment with:

PostgreSQL database

FastAPI backend service

A shared Docker network

Persistent storage via a named volume

I created and configured:

docker-compose.yml

Dockerfile

requirements.txt (cleaned & updated)

Running the backend now requires only:

docker-compose up -d --build

2. Database Setup (PostgreSQL)

Configured a dedicated database:

name: grof

user: postgres

password: postgres

Ensured that the backend connects internally through Docker using:

postgresql://postgres:postgres@db:5432/grof


This allows all services to communicate reliably using container names rather than localhost.

3. SQLAlchemy Models

I implemented all core database models used by the GROF tracer:

Session

Stores profiling session metadata

id, name, start_time, end_time, git_commit_hash, tags

StackFrame

Represents individual stack frames

hash (PK), function_name, file_path

CpuSample

Represents CPU profiling samples

id, session_id, timestamp, thread_id, stack_hash

GpuEvent

Represents GPU activity

id, session_id, name, start_time, end_time, stream_id


All relationships were configured so data joins will work correctly later.

4. Alembic Migrations

This was the largest part of the week.

I configured Alembic to:

load SQLAlchemy models automatically

connect to the Dockerized database

generate schema changes

apply migrations safely

Main steps completed:

✔ Fixed import paths
✔ Fixed metadata discovery in env.py
✔ Updated Alembic config to use db host (not localhost)
✔ Generated the first migration
✔ Applied it successfully

Migration commands used:

alembic revision --autogenerate -m "initial schema"
alembic upgrade head

5. Verification

Connected inside the Postgres container:

docker exec -it grof_db psql -U postgres -d grof


Checked the tables:

grof=# \dt


Result:

alembic_version

cpu_samples

gpu_events

sessions

stack_frames

This confirmed that the schema was created correctly.

Tech Stack Used

FastAPI

SQLAlchemy ORM

Alembic for migrations

PostgreSQL

Docker / Docker Compose


