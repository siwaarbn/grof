from sqlalchemy.orm import Session
from app.models.session import Session as ProfilingSession
import time
import os
import subprocess
import threading


def start_session(
    db: Session,
    name: str = "unnamed",
    git_commit_hash: str = None,
    tags: str = None,
):
    session = ProfilingSession(
        name=name,
        start_time=time.time_ns(),
        end_time=None,
        git_commit_hash=git_commit_hash,
        tags=tags,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _run_ingest(session_id: int, cpu_path: str = None, gpu_path: str = None):
    """Run ingest.py in a background thread after session stop."""
    api_base = os.environ.get("API_BASE_URL", "http://localhost:8000")
    ingest_script = "/app/ingest.py"

    if not os.path.exists(ingest_script):
        print(f"[AUTO-INGEST] ingest.py not found at {ingest_script}, skipping.")
        return

    cmd = ["python3", ingest_script, "--session-id", str(session_id), "--api", api_base]

    if cpu_path and os.path.exists(cpu_path):
        cmd += ["--cpu", cpu_path]
        print(f"[AUTO-INGEST] Found CPU data: {cpu_path}")
    if gpu_path and os.path.exists(gpu_path):
        cmd += ["--gpu", gpu_path]
        print(f"[AUTO-INGEST] Found GPU data: {gpu_path}")

    if "--cpu" not in cmd and "--gpu" not in cmd:
        print(f"[AUTO-INGEST] No data files found, skipping ingestion for session {session_id}.")
        return

    print(f"[AUTO-INGEST] Starting ingestion for session {session_id}...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        print(result.stdout)
        if result.returncode != 0:
            print(f"[AUTO-INGEST] Error: {result.stderr}")
        else:
            print(f"[AUTO-INGEST] Ingestion complete for session {session_id}.")
    except Exception as e:
        print(f"[AUTO-INGEST] Failed: {e}")


def stop_session(db: Session, session_id: int, cpu_file: str = None, gpu_file: str = None):
    session = db.get(ProfilingSession, session_id)
    if not session:
        return None
    session.end_time = time.time_ns()
    db.commit()

    # Look for T1/T2 output files - GROF_DATA_DIR is the mounted repo root (/data)
    data_dir = os.environ.get("GROF_DATA_DIR", "/data")

    search_paths = [
        cpu_file,  # explicit override
        os.path.join(data_dir, "cpu_correlation_with_stack.json"),
        "/tmp/grof/cpu_correlation_with_stack.json",
    ]
    gpu_search_paths = [
        gpu_file,  # explicit override
        os.path.join(data_dir, "gpu_trace.json"),
        "/tmp/grof/gpu_trace.json",
    ]

    cpu_path = next((p for p in search_paths if p and os.path.exists(p)), None)
    gpu_path = next((p for p in gpu_search_paths if p and os.path.exists(p)), None)

    thread = threading.Thread(
        target=_run_ingest,
        args=(session_id, cpu_path, gpu_path),
        daemon=True,
    )
    thread.start()

    return session