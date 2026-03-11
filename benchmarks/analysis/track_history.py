"""
M2 T3 Week 4: Historical Tracking

Tracks GROF's profiler overhead across multiple runs/commits.
Appends data to a CSV database for trend analysis.
"""
import argparse
import csv
import json
import os
import sys
from datetime import datetime

# Add parent directory for stats import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from stats import calculate_stats

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def extract_times(data):
    """Return {benchmark_name: list_of_times}"""
    result = {}
    for entry in data.get("overhead_measurements", []):
        result[entry["benchmark"]] = entry["times_ms"]
    return result

def main():
    parser = argparse.ArgumentParser(description="M2 T3: Track historical overhead")
    parser.add_argument("--baseline", type=str, required=True, help="Baseline JSON")
    parser.add_argument("--profiled", type=str, required=True, help="Profiled/GROF JSON")
    parser.add_argument("--commit", type=str, default="unknown", help="Git commit hash")
    parser.add_argument("--db-csv", type=str, default="benchmarks/results/history.csv", help="Path to historical CSV")
    
    args = parser.parse_args()

    baseline_data = load_json(args.baseline)
    profiled_data = load_json(args.profiled)

    b_times = extract_times(baseline_data)
    p_times = extract_times(profiled_data)

    # Prepare CSV headers if file doesn't exist
    has_header = os.path.isfile(args.db_csv)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(args.db_csv), exist_ok=True)

    with open(args.db_csv, 'a', newline='') as f:
        writer = csv.writer(f)
        if not has_header:
            writer.writerow([
                "Timestamp", "Commit", "Benchmark", "Baseline_Mean_ms", 
                "Profiled_Mean_ms", "Overhead_pct", "CI_lower_pct", "CI_upper_pct"
            ])

        timestamp = datetime.now().isoformat()
        
        for bench_name, baseline_val in b_times.items():
            if bench_name not in p_times:
                continue
                
            profiled_val = p_times[bench_name]
            
            b_stats = calculate_stats(baseline_val)
            p_stats = calculate_stats(profiled_val)
            
            b_mean = b_stats["mean"]
            p_mean = p_stats["mean"]
            
            if b_mean > 0:
                overhead = ((p_mean - b_mean) / b_mean) * 100
                ci_lower = ((p_stats["ci95_lower"] - b_stats["ci95_upper"]) / b_mean) * 100
                ci_upper = ((p_stats["ci95_upper"] - b_stats["ci95_lower"]) / b_mean) * 100
            else:
                overhead, ci_lower, ci_upper = 0, 0, 0
                
            writer.writerow([
                timestamp,
                args.commit,
                bench_name,
                f"{b_mean:.2f}",
                f"{p_mean:.2f}",
                f"{overhead:.2f}",
                f"{ci_lower:.2f}",
                f"{ci_upper:.2f}"
            ])
            
            print(f"Recorded historical data for {bench_name}: {overhead:+.2f}% overhead")

    print(f"\n✅ Successfully updated database: {args.db_csv}")


if __name__ == "__main__":
    main()
