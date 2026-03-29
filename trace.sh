#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# GROF trace.sh — End-to-end profiling in one command
# Usage: bash trace.sh LLM10.py
# ─────────────────────────────────────────────

if [ $# -lt 1 ]; then
  echo "Usage: bash trace.sh <workload.py>"
  exit 1
fi

WORKLOAD="$1"
WORKLOAD_NAME="$(basename "$WORKLOAD")"
API_BASE="${GROF_API:-http://localhost:8000}"
UI_BASE="${GROF_UI:-http://localhost:5173}"
OUTPUT_DIR="${GROF_OUTPUT_DIR:-/tmp/grof}"
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# 1. Clean previous traces and prepare output directory
mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR/cpu_correlation_with_stack.json" "$OUTPUT_DIR/gpu_trace.json"
echo "📁 Output directory: $OUTPUT_DIR"

# 2. Create a session in the backend with the workload name
echo "📋 Creating profiling session for: $WORKLOAD_NAME"
SESSION_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/sessions/start?name=$WORKLOAD_NAME")
SESSION_ID=$(echo "$SESSION_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")
echo "✅ Session created: #$SESSION_ID"

# 3. Start T1 eBPF CPU profiler in background (requires sudo + Linux + GPU)
T1_SCRIPT="$REPO_ROOT/M2/T1/week3/correlation_stacks.py"
T1_PID=""
if [ -f "$T1_SCRIPT" ]; then
  echo "🔍 Starting T1 CPU profiler..."
  sudo python3 "$T1_SCRIPT" --output "$OUTPUT_DIR/cpu_correlation_with_stack.json" &
  T1_PID=$!
else
  echo "⚠️  T1 profiler not found at $T1_SCRIPT — skipping CPU tracing"
fi

# 4. Run the workload with T2 GPU profiler via LD_PRELOAD
T2_LIB="$REPO_ROOT/libgrof_cuda.so"
echo "🚀 Running workload: $WORKLOAD"
if [ -f "$T2_LIB" ]; then
  GROF_OUTPUT_DIR="$OUTPUT_DIR" LD_PRELOAD="$T2_LIB" python3 "$WORKLOAD"
else
  echo "⚠️  T2 library not found at $T2_LIB — running workload without GPU tracing"
  python3 "$WORKLOAD"
fi

# 5. Stop T1 profiler and wait for it to flush output
if [ -n "$T1_PID" ]; then
  echo "⏹️  Stopping T1 CPU profiler..."
  sudo kill "$T1_PID" 2>/dev/null || true
  wait "$T1_PID" 2>/dev/null || true
  sleep 2
fi

# 6. Stop the session (also triggers auto-ingest from /data if files are there)
echo "⏹️  Stopping session..."
curl -s -X POST "$API_BASE/api/v1/sessions/stop/$SESSION_ID" > /dev/null

# 7. Ingest trace files explicitly
INGEST_SCRIPT="$REPO_ROOT/backend/ingest.py"
CPU_FILE="$OUTPUT_DIR/cpu_correlation_with_stack.json"
GPU_FILE="$OUTPUT_DIR/gpu_trace.json"

if [ -f "$INGEST_SCRIPT" ]; then
  CMD="python3 $INGEST_SCRIPT --session-id $SESSION_ID --api $API_BASE"
  [ -f "$CPU_FILE" ] && CMD="$CMD --cpu $CPU_FILE" && echo "📤 Found CPU trace"
  [ -f "$GPU_FILE" ] && CMD="$CMD --gpu $GPU_FILE" && echo "📤 Found GPU trace"
  echo "📤 Uploading traces..."
  eval "$CMD"
else
  echo "⚠️  ingest.py not found — traces may not be uploaded"
fi

# 8. Print the result URL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tracing complete for: $WORKLOAD_NAME"
echo "🔗 View traces at:"
echo "   $UI_BASE/session/$SESSION_ID/correlated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
