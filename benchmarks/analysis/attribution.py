"""
M2 T3 Week 2 — Per-Component Overhead Attribution

Loads benchmark results from different profiling modes and calculates
the overhead contribution of each GROF component:

  - eBPF Only  → CPU-side overhead (stack sampling, uprobe hooks)
  - CUPTI Only → GPU-side overhead (activity tracing, range profiling)
  - Full GROF  → Combined overhead (eBPF + CUPTI)

Usage:
    python attribution.py --baseline baseline.json --ebpf ebpf.json --cupti cupti.json --grof grof.json
    python attribution.py --results-dir ../results    # Auto-detect files by mode prefix
"""

import argparse
import json
import os
import sys
from typing import Dict, List, Any, Optional

# Add parent dir for stats import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from stats import calculate_stats, perform_ttest


# ============================================================================
# LOADING
# ============================================================================

def load_result_file(path: str) -> Dict[str, Any]:
    """Load a benchmark result JSON file."""
    with open(path, "r") as f:
        return json.load(f)


def extract_benchmark_times(data: Dict, benchmark_name: Optional[str] = None) -> Dict[str, List[float]]:
    """
    Extract times_ms per benchmark from overhead_measurements.
    Returns {benchmark_name: [times_ms list]}.
    """
    result = {}
    for entry in data.get("overhead_measurements", []):
        name = entry["benchmark"]
        if benchmark_name and name != benchmark_name:
            continue
        result[name] = entry["times_ms"]
    return result


def find_result_files(results_dir: str) -> Dict[str, str]:
    """
    Auto-detect result files by mode prefix.
    Looks for benchmark_<mode>_*.json files.
    Returns {mode: filepath}.
    """
    found = {}
    modes = ["baseline", "ebpf-only", "cupti-only", "grof", "nsys"]

    for fname in sorted(os.listdir(results_dir)):
        if not fname.endswith(".json"):
            continue
        for mode in modes:
            prefix = f"benchmark_{mode}_"
            if fname.startswith(prefix) and mode not in found:
                found[mode] = os.path.join(results_dir, fname)

    return found


# ============================================================================
# ATTRIBUTION ANALYSIS
# ============================================================================

def compute_overhead(baseline_times: List[float], profiled_times: List[float]) -> Dict[str, Any]:
    """
    Compute overhead percentage and statistical significance.

    Returns:
        dict with overhead_pct, ci95, ttest results
    """
    baseline_stats = calculate_stats(baseline_times)
    profiled_stats = calculate_stats(profiled_times)

    baseline_mean = baseline_stats["mean"]
    profiled_mean = profiled_stats["mean"]

    if baseline_mean == 0:
        overhead_pct = 0.0
    else:
        overhead_pct = ((profiled_mean - baseline_mean) / baseline_mean) * 100

    # Calculate CI for overhead using delta method
    # CI_lower = (profiled_ci_lower - baseline_ci_upper) / baseline_mean * 100
    # CI_upper = (profiled_ci_upper - baseline_ci_lower) / baseline_mean * 100
    if baseline_mean > 0:
        overhead_ci_lower = (
            (profiled_stats["ci95_lower"] - baseline_stats["ci95_upper"])
            / baseline_mean * 100
        )
        overhead_ci_upper = (
            (profiled_stats["ci95_upper"] - baseline_stats["ci95_lower"])
            / baseline_mean * 100
        )
    else:
        overhead_ci_lower = 0.0
        overhead_ci_upper = 0.0

    # T-test for statistical significance
    ttest = perform_ttest(baseline_times, profiled_times)

    return {
        "overhead_pct": round(overhead_pct, 3),
        "overhead_ci95_lower": round(overhead_ci_lower, 3),
        "overhead_ci95_upper": round(overhead_ci_upper, 3),
        "baseline_mean_ms": round(baseline_mean, 2),
        "profiled_mean_ms": round(profiled_mean, 2),
        "baseline_n": baseline_stats["n"],
        "profiled_n": profiled_stats["n"],
        "ttest_p_value": ttest["p_value"],
        "significant_at_95": ttest["significant_at_95"],
    }


def run_attribution(
    baseline_data: Dict,
    ebpf_data: Optional[Dict] = None,
    cupti_data: Optional[Dict] = None,
    grof_data: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Perform full attribution analysis across all benchmarks.

    Returns:
        {benchmark_name: {component: overhead_result}}
    """
    baseline_times = extract_benchmark_times(baseline_data)
    results = {}

    components = {}
    if ebpf_data:
        components["ebpf-only"] = extract_benchmark_times(ebpf_data)
    if cupti_data:
        components["cupti-only"] = extract_benchmark_times(cupti_data)
    if grof_data:
        components["grof (full)"] = extract_benchmark_times(grof_data)

    for bench_name, b_times in baseline_times.items():
        results[bench_name] = {}
        for comp_name, comp_times_map in components.items():
            if bench_name in comp_times_map:
                results[bench_name][comp_name] = compute_overhead(
                    b_times, comp_times_map[bench_name]
                )

    return results


# ============================================================================
# OUTPUT
# ============================================================================

def print_attribution_table(results: Dict[str, Any]) -> None:
    """Print a formatted attribution table."""
    print("\n" + "=" * 80)
    print("M2 T3 WEEK 2 — PER-COMPONENT OVERHEAD ATTRIBUTION")
    print("=" * 80)

    for bench_name, components in results.items():
        print(f"\n--- {bench_name} ---")
        print(f"{'Component':<18} {'Overhead':>10} {'95% CI':>24} {'p-value':>10} {'Sig':>5}")
        print("-" * 70)

        for comp_name, data in components.items():
            ci_str = f"[{data['overhead_ci95_lower']:+.2f}%, {data['overhead_ci95_upper']:+.2f}%]"
            sig_str = "***" if data["significant_at_95"] else "n.s."
            print(
                f"{comp_name:<18} {data['overhead_pct']:>+9.2f}% "
                f"{ci_str:>24} {data['ttest_p_value']:>10.4f} {sig_str:>5}"
            )

        print(f"\n  Baseline: {list(components.values())[0]['baseline_mean_ms']:.2f} ms "
              f"(n={list(components.values())[0]['baseline_n']})" if components else "")

    print("\n" + "=" * 80)
    print("Legend: Sig = statistical significance at 95% level")
    print("        *** = significant, n.s. = not significant")
    print("=" * 80)


def save_attribution_json(results: Dict[str, Any], output_path: str) -> None:
    """Save attribution results as JSON."""
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to: {output_path}")


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="M2 T3 Week 2: Per-Component Overhead Attribution",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Specify each mode file explicitly:
  python attribution.py --baseline base.json --ebpf ebpf.json --cupti cupti.json --grof grof.json

  # Auto-detect from results directory:
  python attribution.py --results-dir ../results

  # Save output as JSON:
  python attribution.py --results-dir ../results --output attribution_report.json
        """,
    )

    parser.add_argument("--baseline", type=str, help="Path to baseline results JSON")
    parser.add_argument("--ebpf", type=str, help="Path to ebpf-only results JSON")
    parser.add_argument("--cupti", type=str, help="Path to cupti-only results JSON")
    parser.add_argument("--grof", type=str, help="Path to grof (full) results JSON")
    parser.add_argument("--results-dir", type=str, help="Auto-detect result files from directory")
    parser.add_argument("--output", "-o", type=str, help="Save results to JSON file")

    args = parser.parse_args()

    # Auto-detect mode
    if args.results_dir:
        files = find_result_files(args.results_dir)
        print(f"Auto-detected files in {args.results_dir}:")
        for mode, path in files.items():
            print(f"  {mode}: {os.path.basename(path)}")

        if "baseline" not in files:
            print("ERROR: No baseline result file found.")
            sys.exit(1)

        args.baseline = args.baseline or files.get("baseline")
        args.ebpf = args.ebpf or files.get("ebpf-only")
        args.cupti = args.cupti or files.get("cupti-only")
        args.grof = args.grof or files.get("grof")

    # Validate
    if not args.baseline:
        print("ERROR: --baseline is required (or use --results-dir)")
        parser.print_help()
        sys.exit(1)

    has_comparison = any([args.ebpf, args.cupti, args.grof])
    if not has_comparison:
        print("ERROR: At least one of --ebpf, --cupti, --grof is required")
        sys.exit(1)

    # Load data
    print(f"\nLoading baseline: {args.baseline}")
    baseline_data = load_result_file(args.baseline)

    ebpf_data = load_result_file(args.ebpf) if args.ebpf else None
    cupti_data = load_result_file(args.cupti) if args.cupti else None
    grof_data = load_result_file(args.grof) if args.grof else None

    if args.ebpf:
        print(f"Loading ebpf-only: {args.ebpf}")
    if args.cupti:
        print(f"Loading cupti-only: {args.cupti}")
    if args.grof:
        print(f"Loading grof: {args.grof}")

    # Run attribution
    results = run_attribution(baseline_data, ebpf_data, cupti_data, grof_data)

    # Output
    print_attribution_table(results)

    if args.output:
        save_attribution_json(results, args.output)


if __name__ == "__main__":
    main()
