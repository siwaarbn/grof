"""
M2 T3 Week 3 — Comparative Report Generator

Loads benchmark results from all profiling modes and generates
a side-by-side comparison table as required by M2 T3 Week 3:

  | Tool   | Runtime Overhead | Memory Overhead | GPU Support | CPU Stack Depth |
  |--------|------------------|-----------------|-------------|-----------------|

Usage:
    python comparison.py --results-dir ../results
    python comparison.py --baseline b.json --nsys n.json --pyspy p.json --grof g.json
    python comparison.py --results-dir ../results --output comparison_report.md
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
# FILE DETECTION
# ============================================================================

def find_result_files(results_dir: str) -> Dict[str, str]:
    """Auto-detect result files by mode prefix."""
    found = {}
    modes = ["baseline", "grof", "nsys", "py-spy", "ebpf-only", "cupti-only"]

    for fname in sorted(os.listdir(results_dir)):
        if not fname.endswith(".json"):
            continue
        for mode in modes:
            prefix = f"benchmark_{mode}_"
            if fname.startswith(prefix) and mode not in found:
                found[mode] = os.path.join(results_dir, fname)

    return found


def load_json(path: str) -> Dict:
    with open(path, "r") as f:
        return json.load(f)


# ============================================================================
# ANALYSIS
# ============================================================================

def extract_times(data: Dict) -> Dict[str, List[float]]:
    """Extract {benchmark_name: times_ms} from overhead_measurements."""
    result = {}
    for entry in data.get("overhead_measurements", []):
        result[entry["benchmark"]] = entry["times_ms"]
    return result


def compute_overhead(baseline_times: List[float], profiled_times: List[float]) -> Dict[str, Any]:
    """Compute overhead %, CI, and t-test."""
    b_stats = calculate_stats(baseline_times)
    p_stats = calculate_stats(profiled_times)

    b_mean = b_stats["mean"]
    p_mean = p_stats["mean"]

    overhead = ((p_mean - b_mean) / b_mean * 100) if b_mean > 0 else 0.0

    ci_lo = ((p_stats["ci95_lower"] - b_stats["ci95_upper"]) / b_mean * 100) if b_mean > 0 else 0.0
    ci_hi = ((p_stats["ci95_upper"] - b_stats["ci95_lower"]) / b_mean * 100) if b_mean > 0 else 0.0

    ttest = perform_ttest(baseline_times, profiled_times)

    return {
        "overhead_pct": round(overhead, 2),
        "ci95_lower": round(ci_lo, 2),
        "ci95_upper": round(ci_hi, 2),
        "baseline_mean_ms": round(b_mean, 2),
        "profiled_mean_ms": round(p_mean, 2),
        "p_value": round(ttest["p_value"], 4),
        "significant": ttest["significant_at_95"],
        "n_baseline": b_stats["n"],
        "n_profiled": p_stats["n"],
    }


# ============================================================================
# TOOL CHARACTERISTICS (static knowledge)
# ============================================================================

TOOL_INFO = {
    "grof": {
        "name": "GROF",
        "gpu_support": "✓",
        "cpu_stack_depth": "30",
        "trace_format": "JSON (compact)",
        "description": "Low-overhead CPU-GPU correlation profiler",
    },
    "nsys": {
        "name": "Nsight Systems",
        "gpu_support": "✓",
        "cpu_stack_depth": "Limited",
        "trace_format": ".nsys-rep (~265 MB)",
        "description": "NVIDIA system-level profiler",
    },
    "py-spy": {
        "name": "py-spy",
        "gpu_support": "✗",
        "cpu_stack_depth": "30",
        "trace_format": "SVG/speedscope",
        "description": "Python sampling profiler",
    },
}


# ============================================================================
# REPORT GENERATION
# ============================================================================

def generate_comparison(
    baseline_data: Dict,
    mode_data: Dict[str, Dict],
) -> Dict[str, Any]:
    """
    Generate full comparison report.

    Args:
        baseline_data: Baseline result JSON
        mode_data: {mode_name: result_json} for each tool

    Returns:
        Structured comparison report
    """
    baseline_times = extract_times(baseline_data)
    report = {"benchmarks": {}, "summary_table": []}

    for mode_name, data in mode_data.items():
        profiled_times = extract_times(data)

        for bench_name, b_times in baseline_times.items():
            if bench_name not in profiled_times:
                continue

            if bench_name not in report["benchmarks"]:
                report["benchmarks"][bench_name] = {}

            p_times = profiled_times[bench_name]
            overhead = compute_overhead(b_times, p_times)
            report["benchmarks"][bench_name][mode_name] = overhead

    # Build summary table (average across benchmarks)
    for mode_name in mode_data:
        overheads = []
        for bench, modes in report["benchmarks"].items():
            if mode_name in modes:
                overheads.append(modes[mode_name]["overhead_pct"])

        avg_overhead = sum(overheads) / len(overheads) if overheads else 0.0
        info = TOOL_INFO.get(mode_name, {})

        ci_parts = []
        for bench, modes in report["benchmarks"].items():
            if mode_name in modes:
                ci_parts.append(
                    f"{modes[mode_name]['ci95_lower']:+.2f}%, {modes[mode_name]['ci95_upper']:+.2f}%"
                )

        report["summary_table"].append({
            "tool": info.get("name", mode_name),
            "mode": mode_name,
            "avg_overhead_pct": round(avg_overhead, 2),
            "gpu_support": info.get("gpu_support", "?"),
            "cpu_stack_depth": info.get("cpu_stack_depth", "?"),
            "trace_format": info.get("trace_format", "?"),
        })

    return report


def print_report(report: Dict[str, Any]) -> None:
    """Print formatted comparison report."""
    print("\n" + "=" * 80)
    print("M2 T3 WEEK 3 — COMPARATIVE STUDY: GROF vs INDUSTRY TOOLS")
    print("=" * 80)

    # Per-benchmark details
    for bench_name, modes in report["benchmarks"].items():
        print(f"\n### {bench_name}")
        print(f"{'Tool':<18} {'Overhead':>10} {'95% CI':>24} {'p-value':>10} {'N':>5}")
        print("-" * 70)

        for mode_name, data in modes.items():
            name = TOOL_INFO.get(mode_name, {}).get("name", mode_name)
            ci_str = f"[{data['ci95_lower']:+.2f}%, {data['ci95_upper']:+.2f}%]"
            print(
                f"{name:<18} {data['overhead_pct']:>+9.2f}% "
                f"{ci_str:>24} {data['p_value']:>10.4f} {data['n_profiled']:>5}"
            )

    # Summary table
    print(f"\n\n{'='*80}")
    print("SUMMARY COMPARISON TABLE")
    print(f"{'='*80}")
    print(f"{'Tool':<18} {'Runtime Overhead':>18} {'GPU':>5} {'CPU Stack':>12} {'Trace Format':>20}")
    print("-" * 75)

    for row in report["summary_table"]:
        overhead_str = f"{row['avg_overhead_pct']:+.2f}%"
        print(
            f"{row['tool']:<18} {overhead_str:>18} "
            f"{row['gpu_support']:>5} {row['cpu_stack_depth']:>12} "
            f"{row['trace_format']:>20}"
        )

    print("=" * 80)


def generate_markdown(report: Dict[str, Any]) -> str:
    """Generate markdown version of the comparison report."""
    lines = []
    lines.append("# Comparative Study — GROF vs Industry Tools\n")
    lines.append("## Summary\n")
    lines.append("| Tool | Runtime Overhead | GPU Support | CPU Stack Depth | Trace Format |")
    lines.append("|------|-----------------|-------------|-----------------|--------------|")

    for row in report["summary_table"]:
        lines.append(
            f"| {row['tool']} | {row['avg_overhead_pct']:+.2f}% "
            f"| {row['gpu_support']} | {row['cpu_stack_depth']} "
            f"| {row['trace_format']} |"
        )

    lines.append("\n## Per-Benchmark Details\n")

    for bench_name, modes in report["benchmarks"].items():
        lines.append(f"### {bench_name}\n")
        lines.append("| Tool | Overhead | 95% CI | p-value | N |")
        lines.append("|------|---------|--------|---------|---|")

        for mode_name, data in modes.items():
            name = TOOL_INFO.get(mode_name, {}).get("name", mode_name)
            ci_str = f"[{data['ci95_lower']:+.2f}%, {data['ci95_upper']:+.2f}%]"
            lines.append(
                f"| {name} | {data['overhead_pct']:+.2f}% "
                f"| {ci_str} | {data['p_value']:.4f} | {data['n_profiled']} |"
            )

        lines.append("")

    return "\n".join(lines)


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="M2 T3 Week 3: Generate Comparative Study Report",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python comparison.py --results-dir ../results
  python comparison.py --baseline b.json --nsys n.json --grof g.json
  python comparison.py --results-dir ../results --output report.md
        """,
    )

    parser.add_argument("--baseline", type=str, help="Path to baseline results JSON")
    parser.add_argument("--grof", type=str, help="Path to GROF results JSON")
    parser.add_argument("--nsys", type=str, help="Path to Nsys results JSON")
    parser.add_argument("--pyspy", type=str, help="Path to py-spy results JSON")
    parser.add_argument("--results-dir", type=str, help="Auto-detect from directory")
    parser.add_argument("--output", "-o", type=str, help="Save markdown report to file")
    parser.add_argument("--json", type=str, help="Save raw JSON report to file")

    args = parser.parse_args()

    # Auto-detect
    if args.results_dir:
        files = find_result_files(args.results_dir)
        print(f"Auto-detected files in {args.results_dir}:")
        for mode, path in files.items():
            print(f"  {mode}: {os.path.basename(path)}")

        args.baseline = args.baseline or files.get("baseline")
        args.nsys = args.nsys or files.get("nsys")
        args.pyspy = args.pyspy or files.get("py-spy")
        args.grof = args.grof or files.get("grof")

    if not args.baseline:
        print("ERROR: --baseline required (or use --results-dir)")
        sys.exit(1)

    # Load
    baseline_data = load_json(args.baseline)
    mode_data = {}

    if args.nsys:
        mode_data["nsys"] = load_json(args.nsys)
    if args.pyspy:
        mode_data["py-spy"] = load_json(args.pyspy)
    if args.grof:
        mode_data["grof"] = load_json(args.grof)

    if not mode_data:
        print("ERROR: At least one of --nsys, --pyspy, --grof is required")
        sys.exit(1)

    # Generate report
    report = generate_comparison(baseline_data, mode_data)

    # Output
    print_report(report)

    if args.output:
        md = generate_markdown(report)
        with open(args.output, "w") as f:
            f.write(md)
        print(f"\nMarkdown report saved to: {args.output}")

    if args.json:
        with open(args.json, "w") as f:
            json.dump(report, f, indent=2)
        print(f"JSON report saved to: {args.json}")


if __name__ == "__main__":
    main()
