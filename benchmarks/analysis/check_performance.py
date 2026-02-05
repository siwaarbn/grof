import json
import os
import sys
import numpy as np

# ================= CONFIG =================
BASELINE_FILE = "benchmarks/results/benchmark_baseline_reference.json"
CURRENT_FILE  = "benchmarks/results/benchmark_latest.json"
THRESHOLD = 0.02   # 2% allowed overhead
# ==========================================


# ---------- CI SAFETY ----------
if not os.path.exists(BASELINE_FILE):
    print("⚠ No baseline reference found — skipping regression check.")
    sys.exit(0)

if not os.path.exists(CURRENT_FILE):
    print("⚠ No current benchmark found — skipping regression check.")
    sys.exit(0)
# ------------------------------


def load_mean_runtime(path):
    with open(path, "r") as f:
        data = json.load(f)

    means = []
    for entry in data["overhead_measurements"]:
        means.append(entry["statistics"]["mean"])

    return np.mean(means)


baseline_mean = load_mean_runtime(BASELINE_FILE)
current_mean  = load_mean_runtime(CURRENT_FILE)

overhead = (current_mean - baseline_mean) / baseline_mean

print("Performance regression check")
print("--------------------------------")
print(f"Baseline mean runtime : {baseline_mean:.2f} ms")
print(f"Current mean runtime  : {current_mean:.2f} ms")
print(f"Overhead              : {overhead*100:.2f}%")

if overhead > THRESHOLD:
    print(" Performance regression detected (> 2%)")
    sys.exit(1)

print("Performance within acceptable limits")
sys.exit(0)
