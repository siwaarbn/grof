#!/usr/bin/env python3
"""
GROF Ingestion Script — Load T1 and T2 output into the backend.

This is the missing link between T1/T2 profiler output and the backend database.

Usage:
    python3 ingest.py --session-id 1 \\
                      --cpu cpu_correlation_with_stack.json \\
                      --gpu gpu_trace.json \\
                      --api http://localhost:8000

    # Dry-run (no HTTP calls):
    python3 ingest.py --dry-run --cpu cpu_correlation_with_stack.json --gpu gpu_trace.json

Field mappings applied:
    T1 (cpu_correlation_with_stack.json) -> POST /api/v1/sessions/{id}/cpu-correlation
        timestamp       -> timestamp_ns
        correlation_id  -> correlation_id
        stack (list)    -> stack_hash (JSON-serialized string)
        tid             -> (included in record)

    T2 (gpu_trace.json) -> POST /api/v1/sessions/{id}/gpu-events
        name            -> name
        ts * 1000       -> start_time  (µs -> ns)
        (ts+dur) * 1000 -> end_time    (µs -> ns)
        args.correlationId -> correlation_id
        tid             -> stream_id
"""

import argparse
import json
import sys
import math
import requests


def load_jsonl(path):
    """Load a newline-delimited JSON file (T1 format)."""
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def load_json_array(path):
    """Load a JSON array file (T2 format)."""
    with open(path) as f:
        return json.load(f)


def map_cpu_records(raw_records):
    """Map T1 output fields to the backend CpuCorrelationBatch schema."""
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


def map_gpu_records(raw_records):
    """Map T2 gpu_trace.json fields to the backend GpuEvent schema."""
    items = []
    for rec in raw_records:
        ph = rec.get("ph", "")
        if ph != "X":   # only complete events
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
        print(f"  [DRY-RUN] POST {url}  ({len(payload)} records)")
        return
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    result = resp.json()
    print(f"  ✅ POST {url} -> {result}")


def main():
    parser = argparse.ArgumentParser(description="GROF T1/T2 → Backend Ingestion")
    parser.add_argument("--session-id", type=int, default=1,
                        help="Backend session ID to ingest into (default: 1)")
    parser.add_argument("--cpu", type=str, default=None,
                        help="Path to T1 output: cpu_correlation_with_stack.json")
    parser.add_argument("--gpu", type=str, default=None,
                        help="Path to T2 output: gpu_trace.json")
    parser.add_argument("--api", type=str, default="http://localhost:8000",
                        help="Backend API base URL (default: http://localhost:8000)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be sent without making HTTP calls")
    parser.add_argument("--batch-size", type=int, default=500,
                        help="Records per POST request (default: 500)")
    args = parser.parse_args()

    if not args.cpu and not args.gpu:
        print("[ERROR] Provide at least one of --cpu or --gpu")
        sys.exit(1)

    # --- Ingest T1 CPU correlation data ---
    if args.cpu:
        print(f"\n[T1] Loading {args.cpu} ...")
        raw = load_jsonl(args.cpu)
        items = map_cpu_records(raw)
        print(f"  {len(raw)} raw records -> {len(items)} correlation events")

        batches = math.ceil(len(items) / args.batch_size)
        for i in range(batches):
            batch = items[i * args.batch_size : (i + 1) * args.batch_size]
            post_batch(args.api, args.session_id, "cpu-correlation",
                       {"items": batch}, args.dry_run)

    # --- Ingest T2 GPU trace data ---
    if args.gpu:
        print(f"\n[T2] Loading {args.gpu} ...")
        raw = load_json_array(args.gpu)
        items = map_gpu_records(raw)
        print(f"  {len(raw)} raw records -> {len(items)} GPU events")

        batches = math.ceil(len(items) / args.batch_size)
        for i in range(batches):
            batch = items[i * args.batch_size : (i + 1) * args.batch_size]
            post_batch(args.api, args.session_id, "gpu-events",
                       {"events": batch}, args.dry_run)

    print("\n[INFO] Ingestion complete.")


if __name__ == "__main__":
    main()
