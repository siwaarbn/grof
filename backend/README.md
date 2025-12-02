
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








