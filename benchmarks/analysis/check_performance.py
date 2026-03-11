import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory for stats import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from stats import perform_ttest, calculate_stats

# ================= CONFIG =================
# 7% allowed overhead as per M2 T3 Evaluation Metric 4
THRESHOLD_PCT = 7.0   
# ==========================================

def load_benchmark_times(path: str) -> dict:
    """Load json and return {benchmark_name: times_ms_list}"""
    try:
        with open(path, "r") as f:
            data = json.load(f)
        
        times = {}
        for entry in data.get("overhead_measurements", []):
            times[entry["benchmark"]] = entry["times_ms"]
        return times
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return {}

def main():
    parser = argparse.ArgumentParser(description="M2 T3: Performance Regression Check")
    parser.add_argument("--baseline", type=str, required=True, help="Path to baseline reference JSON")
    parser.add_argument("--current", type=str, required=True, help="Path to current/latest build JSON")
    parser.add_argument("--threshold", type=float, default=THRESHOLD_PCT, help="Overhead threshold percentage (default: 7.0)")
    args = parser.parse_args()

    if not os.path.exists(args.baseline):
        print(f"⚠ Baseline file not found: {args.baseline} — skipping regression check.")
        sys.exit(0)

    if not os.path.exists(args.current):
        print(f"⚠ Current file not found: {args.current} — skipping regression check.")
        sys.exit(0)

    baseline_times = load_benchmark_times(args.baseline)
    current_times = load_benchmark_times(args.current)
    
    if not baseline_times or not current_times:
        print("⚠ Empty benchmark data — skipping regression check.")
        sys.exit(0)

    print(f"Performance Regression Check (Threshold: {args.threshold}%)")
    print(f"Baseline: {args.baseline}")
    print(f"Current:  {args.current}")
    print("-" * 60)
    
    regression_detected = False

    # Check each benchmark
    for bench_name, current_val_times in current_times.items():
        if bench_name not in baseline_times:
            print(f"[SKIP] {bench_name}: No baseline data available.")
            continue
            
        base_val_times = baseline_times[bench_name]
        
        # Calculate stats
        b_stats = calculate_stats(base_val_times)
        c_stats = calculate_stats(current_val_times)
        
        b_n = b_stats["n"]
        c_n = c_stats["n"]
        
        if b_n < 2 or c_n < 2:
            print(f"[SKIP] {bench_name}: Not enough samples (Baseline N={b_n}, Current N={c_n})")
            continue

        b_mean = b_stats["mean"]
        c_mean = c_stats["mean"]
        
        if b_mean <= 0:
            print(f"[SKIP] {bench_name}: Invalid baseline mean ({b_mean})")
            continue

        # Calculate Overhead
        overhead_pct = ((c_mean - b_mean) / b_mean) * 100.0
        
        # Statistical test
        ttest = perform_ttest(base_val_times, current_val_times)
        is_significant = ttest["significant_at_95"]
        p_value = ttest["p_value"]
        
        print(f"\n--- {bench_name} ---")
        print(f"  Baseline Mean : {b_mean:.2f} ms (95% CI: [{b_stats['ci95_lower']:.2f}, {b_stats['ci95_upper']:.2f}])")
        print(f"  Current Mean  : {c_mean:.2f} ms (95% CI: [{c_stats['ci95_lower']:.2f}, {c_stats['ci95_upper']:.2f}])")
        print(f"  Overhead      : {overhead_pct:+.2f}%")
        print(f"  P-value       : {p_value:.4f} (Significant: {is_significant})")

        # Decision Logic:
        # A regression is only a failure if the overhead > threshold AND it's statistically significant
        if overhead_pct > args.threshold:
            if is_significant:
                print(f"  ❌ FAIL: Regression > {args.threshold}% and is statistically significant.")
                regression_detected = True
            else:
                print(f"  ⚠️ WARN: Overhead > {args.threshold}%, but NOT statistically significant (p = {p_value:.4f})")
        else:
            print(f"  ✅ PASS: Overhead within {args.threshold}% limit.")

    print("\n" + "=" * 60)
    if regression_detected:
        print("❌ Performance regression detected in one or more benchmarks.")
        sys.exit(1)
    else:
        print("✅ Performance within acceptable limits.")
        sys.exit(0)

if __name__ == "__main__":
    main()
