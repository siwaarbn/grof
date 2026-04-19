#!/usr/bin/env python3
"""
GROF Ingestion Script — Load T1 and T2 output into the backend.

Usage:
    python3 ingest.py --session-id 1 \
                      --cpu cpu_correlation_with_stack.json \
                      --gpu gpu_trace.json \
                      --api http://localhost:8000
"""

import argparse
import json
import sys
import math
import requests


# M1/T1 eBPF profiler runs at 99 Hz — each sample represents this many ms of CPU time.
SAMPLE_INTERVAL_MS = 1000.0 / 99


def load_jsonl(path):
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def load_json_array(path):
    with open(path) as f:
        return json.load(f)


def load_file(path):
    """
    Load a CPU or GPU data file — handles three formats:
      1. JSON array   : M1/T1 cpu_samples.json, M1/T2 gpu_trace.json
      2. JSONL        : one compact JSON object per line
      3. Multi-object : concatenated pretty-printed JSON objects (M2/T1/week3 format)
    """
    with open(path) as f:
        content = f.read().strip()

    # Format 1: JSON array
    if content.startswith("["):
        return json.loads(content)

    # Format 2 & 3: one or more JSON objects — use the streaming decoder
    records = []
    decoder = json.JSONDecoder()
    idx = 0
    while idx < len(content):
        # Skip whitespace between objects
        while idx < len(content) and content[idx] in " \t\n\r":
            idx += 1
        if idx >= len(content):
            break
        obj, end = decoder.raw_decode(content, idx)
        records.append(obj)
        idx = end
    return records


def map_cpu_records(raw_records):
    """Map T1 output to cpu-correlation schema."""
    items = []
    for rec in raw_records:
        if rec.get("type") != "correlation":
            continue
        stack = rec.get("stack", [])
        items.append({
            "type": rec.get("type"),
            "timestamp": int(rec["timestamp"]),
            "pid": rec.get("pid"),
            "tid": rec.get("tid"),
            "correlation_id": int(rec["correlation_id"]),
            "stack": stack,
        })
    return items


def map_cpu_samples(raw_records):
    """
    Also map T1 stack data into cpu_samples + stack_frames so the flamegraph works.
    Each function in each stack becomes a cpu_sample entry.
    """
    samples = []
    stack_frames = {}  # hash -> function_name

    for rec in raw_records:
        if rec.get("type") != "correlation":
            continue
        stack = rec.get("stack", [])
        timestamp = int(rec["timestamp"])
        tid = rec.get("tid", 0)

        for fn_name in stack:
            # Use the function name itself as the hash (simple but works)
            stack_frames[fn_name] = fn_name
            samples.append({
                "timestamp": timestamp,
                "thread_id": tid,
                "stack_hash": fn_name,
            })

    return samples, stack_frames


def map_t1_cpu_samples(raw_records):
    """
    Map M1/T1 eBPF profiler output (cpu_samples.json) to cpu_samples + stack_frames.

    M1/T1 format:
      {"type": "cpu_sample", "pid": 1234, "timestamp_ns": 123456789,
       "sample_count": 42, "stack": ["train", "forward", "conv2d"]}

    Each function in the stack was observed `sample_count` times.
    We insert one CpuSample row per observation so that the aggregation in
    sessions.py (SAMPLE_INTERVAL_MS per row) yields the correct CPU time.
    """
    samples = []
    stack_frames = {}

    for rec in raw_records:
        if rec.get("type") != "cpu_sample":
            continue
        stack = rec.get("stack", [])
        timestamp = int(rec.get("timestamp_ns", rec.get("timestamp", 0)))
        tid = rec.get("pid", rec.get("tid", 0))
        count = max(1, int(rec.get("sample_count", 1)))

        for fn_name in stack:
            stack_frames[fn_name] = fn_name
            # One row per sample so SAMPLE_INTERVAL_MS × count = correct CPU ms
            for i in range(count):
                samples.append({
                    "timestamp": timestamp + i,
                    "thread_id": tid,
                    "stack_hash": fn_name,
                })

    return samples, stack_frames


def map_gpu_records(raw_records):
    items = []
    for rec in raw_records:
        ph = rec.get("ph", "")
        if ph != "X":
            continue
        args = rec.get("args", {})
        correlation_id = args.get("correlationId") or args.get("correlation_id")
        items.append({
            "name": rec.get("name", "unknown"),
            "ph": rec.get("ph"),
            "ts": rec.get("ts", 0),
            "dur": rec.get("dur", 0),
            "pid": rec.get("pid"),
            "tid": rec.get("tid"),
            "args": {"correlationId": int(correlation_id)} if correlation_id is not None else None,
        })
    return items


def post_batch(api_base, session_id, endpoint, payload, dry_run):
    url = f"{api_base}/api/v1/sessions/{session_id}/{endpoint}"
    if dry_run:
        print(f"  [DRY-RUN] POST {url}")
        return
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    result = resp.json()
    print(f"  ✅ POST {url} -> {result}")


def post_stack_frames(api_base, stack_frames, dry_run):
    """Insert stack_frames directly via DB or a dedicated endpoint if available."""
    # We'll use psycopg2 directly since there's no REST endpoint for stack_frames
    # But since we're inside Docker we use the cpu-samples endpoint which auto-resolves
    # stack_frames are inserted via the stack_hash in cpu_samples
    pass


def main():
    parser = argparse.ArgumentParser(description="GROF T1/T2 → Backend Ingestion")
    parser.add_argument("--session-id", type=int, default=1)
    parser.add_argument("--cpu", type=str, default=None)
    parser.add_argument("--gpu", type=str, default=None)
    parser.add_argument("--api", type=str, default="http://localhost:8000")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()

    if not args.cpu and not args.gpu:
        print("[ERROR] Provide at least one of --cpu or --gpu")
        sys.exit(1)

    # --- Ingest T1 CPU data ---
    if args.cpu:
        print(f"\n[T1] Loading {args.cpu} ...")
        raw = load_file(args.cpu)

        # Detect format by inspecting record types
        has_correlation = any(r.get("type") == "correlation" for r in raw)
        has_t1_samples = any(r.get("type") == "cpu_sample" for r in raw)

        if has_correlation:
            # ── M2/T1 format: cpu_correlation_with_stack.json ──────────────
            items = map_cpu_records(raw)
            print(f"  {len(raw)} raw records -> {len(items)} correlation events [M2/T1 format]")

            batches = math.ceil(max(len(items), 1) / args.batch_size)
            for i in range(batches):
                batch = items[i * args.batch_size:(i + 1) * args.batch_size]
                post_batch(args.api, args.session_id, "cpu-correlation",
                           {"items": batch}, args.dry_run)

            samples, stack_frames = map_cpu_samples(raw)
            print(f"  {len(samples)} cpu samples, {len(stack_frames)} unique functions")

        elif has_t1_samples:
            # ── M1/T1 format: cpu_samples.json (week4_profiler.py output) ──
            samples, stack_frames = map_t1_cpu_samples(raw)
            print(f"  {len(raw)} raw records -> {len(samples)} cpu sample rows, "
                  f"{len(stack_frames)} unique functions [M1/T1 eBPF format]")

        else:
            print(f"  [WARN] Unrecognised CPU file format — skipping")
            samples, stack_frames = [], {}

        # Insert stack_frames via psycopg2 directly (no REST endpoint exists)
        if stack_frames and not args.dry_run:
            try:
                import psycopg2
                import os
                db_url = os.environ.get(
                    "DATABASE_URL",
                    "postgresql://admin:admin@localhost:5432/grof"
                )
                # parse URL
                conn = psycopg2.connect(db_url.replace("postgresql+psycopg2://", "postgresql://"))
                cur = conn.cursor()
                for hash_val, fn_name in stack_frames.items():
                    cur.execute(
                        "INSERT INTO stack_frames (hash, function_name) VALUES (%s, %s) ON CONFLICT (hash) DO NOTHING",
                        (hash_val, fn_name)
                    )
                # Also insert a dummy time offset for critical path analysis
                cur.execute("SELECT id FROM session_time_offsets WHERE session_id = %s", (args.session_id,))
                if not cur.fetchone():
                    cur.execute(
                        "INSERT INTO session_time_offsets (session_id, cpu_sync_timestamp_ns, gpu_sync_timestamp_ns, offset_ns) VALUES (%s, %s, %s, %s)",
                        (args.session_id, 0, 0, 0)
                    )
                conn.commit()
                cur.close()
                conn.close()
                print(f"  ✅ Inserted {len(stack_frames)} stack_frames into DB")
            except Exception as e:
                print(f"  ⚠️  Could not insert stack_frames: {e}")

        # Insert cpu_samples via API
        if samples:
            batches = math.ceil(len(samples) / args.batch_size)
            for i in range(batches):
                batch = samples[i * args.batch_size:(i + 1) * args.batch_size]
                post_batch(args.api, args.session_id, "cpu-samples",
                           {"samples": batch}, args.dry_run)

    # --- Ingest T2 GPU data ---
    if args.gpu:
        print(f"\n[T2] Loading {args.gpu} ...")
        raw = load_file(args.gpu)
        items = map_gpu_records(raw)
        print(f"  {len(raw)} raw records -> {len(items)} GPU events")

        batches = math.ceil(max(len(items), 1) / args.batch_size)
        for i in range(batches):
            batch = items[i * args.batch_size:(i + 1) * args.batch_size]
            post_batch(args.api, args.session_id, "gpu-events",
                       {"events": batch}, args.dry_run)

    print("\n[INFO] Ingestion complete.")


if __name__ == "__main__":
    main()