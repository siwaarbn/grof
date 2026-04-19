"""
Statistical utilities for benchmark analysis.
Provides mean, std, 95% confidence intervals, and t-test comparison.
"""

import numpy as np
from scipy import stats
from typing import List, Dict, Any


def calculate_stats(data: List[float]) -> Dict[str, Any]:
    """
    Calculate comprehensive statistics for benchmark results.
    
    Args:
        data: List of timing measurements (in milliseconds)
        
    Returns:
        Dictionary with n, mean, std, ci95, median, min, max
    """
    arr = np.array(data)
    n = len(arr)
    
    if n < 2:
        return {
            "n": n,
            "mean": float(arr[0]) if n == 1 else 0.0,
            "std": 0.0,
            "ci95_lower": float(arr[0]) if n == 1 else 0.0,
            "ci95_upper": float(arr[0]) if n == 1 else 0.0,
            "median": float(arr[0]) if n == 1 else 0.0,
            "min": float(arr[0]) if n == 1 else 0.0,
            "max": float(arr[0]) if n == 1 else 0.0,
        }
    
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1))  # Sample std deviation
    sem = stats.sem(arr)  # Standard error of the mean
    
    # 95% confidence interval using t-distribution
    ci95 = sem * stats.t.ppf(0.975, n - 1)
    
    return {
        "n": n,
        "mean": mean,
        "std": std,
        "ci95_lower": mean - ci95,
        "ci95_upper": mean + ci95,
        "median": float(np.median(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
    }


def calculate_overhead(baseline_stats: Dict, profiled_stats: Dict) -> float:
    """
    Calculate overhead percentage comparing profiled vs baseline.
    
    Args:
        baseline_stats: Statistics dict from calculate_stats (no profiler)
        profiled_stats: Statistics dict from calculate_stats (with profiler)
        
    Returns:
        Overhead as percentage (e.g., 5.2 means 5.2% slower)
    """
    baseline_mean = baseline_stats["mean"]
    profiled_mean = profiled_stats["mean"]
    
    if baseline_mean == 0:
        return 0.0
    
    return ((profiled_mean - baseline_mean) / baseline_mean) * 100


def perform_ttest(data1: List[float], data2: List[float]) -> Dict[str, Any]:
    """
    Perform Welch's t-test to check if difference is statistically significant.
    
    Args:
        data1: First dataset (e.g., baseline)
        data2: Second dataset (e.g., profiled)
        
    Returns:
        Dictionary with t-statistic, p-value, and significance flag
    """
    t_stat, p_value = stats.ttest_ind(data1, data2, equal_var=False)
    
    return {
        "t_statistic": float(t_stat),
        "p_value": float(p_value),
        "significant_at_95": p_value < 0.05,
        "significant_at_99": p_value < 0.01,
    }


def format_stats_report(stats_dict: Dict) -> str:
    """
    Format statistics as human-readable string.
    
    Args:
        stats_dict: Output from calculate_stats
        
    Returns:
        Formatted string like "100.5 ± 2.3 ms (n=30, 95% CI)"
    """
    mean = stats_dict["mean"]
    ci_half = (stats_dict["ci95_upper"] - stats_dict["ci95_lower"]) / 2
    n = stats_dict["n"]
    
    return f"{mean:.2f} ± {ci_half:.2f} ms (n={n}, 95% CI)"


if __name__ == "__main__":
    # Test with sample data
    sample = [100.5, 101.2, 99.8, 100.1, 100.9, 99.5, 101.0, 100.3, 99.7, 100.2]
    
    result = calculate_stats(sample)
    print("Sample Statistics:")
    print(f"  Mean: {result['mean']:.2f} ms")
    print(f"  Std:  {result['std']:.2f} ms")
    print(f"  95% CI: [{result['ci95_lower']:.2f}, {result['ci95_upper']:.2f}]")
    print(f"  {format_stats_report(result)}")
