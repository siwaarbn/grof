
# BACKEND REPORT - Week 1 
**Project: GROF**  
**Team T4: Backend & Data Pipeline**
---------------------------------------------
### Objective of the week 
#### The goal for week 1 was to set up the entire backend infrastructure for the project, including containerization, database configuration and service networking.
--------------------------------------
### Deliverables
1. ***Backend Environment Setup*** :  
    A clean backend project structure was created :  
    backend/  
    │── api/  
    │── models/  
    │── app.py  
    │── Dockerfile  
    │── requirements.txt  
    │── docker-compose.yml

2. ***Minimal FastAPI Application***  
Implemented a basic FastAPI endpoint to verify that the backend container runs correctly:     
![app.py image](image-1.png)   
This confirms that the backend starts successfully inside Docker. 
3. **Full containerization ( Docker & Docker compose )**  
    A multi-container setup was created using docker compose containing:

    **FastAPI Backend Container**
    - Built using a custom Dockerfile and based on Python 3.10 Alpine image  
    - Runs FastAPI via Uvicorn  

    **Database Container (PostgreSQL)**
    - Auto-created database, user and password  
    - Uses a persistent docker volume so data survives restarts  

    **PgAdmin Container (Database UI)**
    - Accessible via localhost:5050  
    - Allows inspection of the PostgreSQL database  

    **Internal Docker Network**  
    All containers communicate internally. The backend accesses the database using  
    the connection string: **postgres://admin:admin@db:5432/grof**

4. **Validation & Testing**   
    **docker compose up --build**   
    This confirms the backend environment and container architecture are fully operational.
5. **Outcome of week 1**
    - Fully containerized backend system
    - Clean and scalable backend folder structure
    - Working API endpoint
    - Functional PostgreSQL database container
    - Database UI via PgAdmin
    - Robust internal networking between services

---------------------------------------------


# BACKEND REPORT – Week 2 & Week 3


---------------------------------------------

## Week 2 – Advanced Data Modeling & Database Migrations

### Objective of the week
The goal for Week 2 was to design and implement a scalable database schema for profiling data and to introduce structured database migrations using Alembic. The focus was on handling high-frequency CPU/GPU profiling data efficiently while avoiding unnecessary data duplication.

---------------------------------------------

### Deliverables

#### 1. Database Schema Design
A relational database schema was designed to represent profiling sessions and their associated data.

The following core entities were implemented:

**Session**
- Represents a profiling run
- Stores metadata about the execution
- Fields include:
  - `id`
  - `name`
  - `start_time`
  - `end_time`
  - `git_commit_hash`
  - `tags`

**CpuSample**
- Represents a single CPU profiling sample
- Designed for very high ingestion rates
- Fields include:
  - `session_id` (foreign key)
  - `timestamp` (stored in nanoseconds)
  - `thread_id`
  - `stack_hash`

**StackFrame**
- Stores unique stack frames using hashing to avoid duplicated strings
- Fields include:
  - `hash`
  - `function_name`
  - `file_path`

**GpuEvent**
- Schema prepared for GPU kernel execution events
- Fields include:
  - `session_id`
  - `name`
  - `start_time`
  - `end_time`
  - `stream_id`

---------------------------------------------

#### 2. SQLAlchemy ORM Integration
- All tables were implemented using SQLAlchemy ORM
- Foreign-key relationships were defined between sessions, CPU samples, and stack frames
- Models were organized under `app/models` to keep a clean and maintainable structure
- The schema supports efficient joins and future aggregation queries

---------------------------------------------

#### 3. Alembic Migration Setup
- Alembic was configured to manage database schema changes
- All tables were created using migrations instead of manual SQL
- This ensures reproducibility and safe schema evolution during development

---------------------------------------------

#### 4. Outcome of Week 2
- Well-structured relational schema for profiling data
- Reduced storage overhead using stack frame hashing
- ORM-based database access layer
- Migration-based schema management
- Backend ready for large-scale data ingestion

---------------------------------------------

## Week 3 – API Logic & Data Ingestion

### Objective of the week
The goal for Week 3 was to implement backend API logic for ingesting profiling data and to validate the full data pipeline from API request to database persistence. The focus was on CPU sample ingestion as a foundation for later aggregation and visualization.

---------------------------------------------

### Deliverables

#### 1. CPU Sample Ingestion Endpoint
A high-level ingestion endpoint was implemented:

This endpoint:
- Retrieves all CPU samples associated with a session
- Confirms successful data persistence
- Supports debugging and validation of ingestion logic

---------------------------------------------

#### 3. End-to-End Pipeline Validation
The full backend data pipeline was validated:

**API Request → FastAPI → SQLAlchemy ORM → PostgreSQL → API Response**

Successful validation confirmed:
- Correct database writes
- Correct foreign-key relationships
- Stable containerized execution

Example response:
```json
{
  "session_id": 2,
  "count": 2,
  "samples": [
    {
      "id": 9,
      "timestamp": 1230000000,
      "thread_id": 0,
      "stack_hash": "..."
    }
  ]
}

---------------------------------------------
### 4. Outcome of Week 3
- Functional batch ingestion for CPU profiling data  
- Verified persistence of CPU samples in PostgreSQL  
- Stable and tested API endpoints for data ingestion and retrieval  
- Backend prepared for aggregation logic and flamegraph generation  

---------------------------------------------
### Status After Week 3
- Backend infrastructure fully operational  
- Database schema implemented and validated  
- CPU data ingestion pipeline working end-to-end  
- System ready for aggregation logic and visualization support  
---------------------------------------------





