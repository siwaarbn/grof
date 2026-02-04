"""
Controlled Environment Setup for Benchmark Consistency.
M2 T3 Week 1: Requirement 2 - Disable CPU frequency scaling.

Usage:
    sudo python controlled_env.py --set-performance   # Set performance mode
    python controlled_env.py --check                  # Check current state
"""

import subprocess
import sys
import os
from pathlib import Path
from typing import Dict, Optional


def get_cpu_governor() -> Optional[str]:
    """
    Get current CPU frequency governor.
    Returns None if not available (e.g., on macOS).
    """
    governor_path = Path("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor")
    
    if not governor_path.exists():
        return None
    
    try:
        return governor_path.read_text().strip()
    except PermissionError:
        return "unknown (no permission)"


def get_all_cpu_governors() -> Dict[int, str]:
    """Get governor for each CPU core."""
    cpufreq_path = Path("/sys/devices/system/cpu")
    governors = {}
    
    for cpu_dir in sorted(cpufreq_path.glob("cpu[0-9]*")):
        governor_file = cpu_dir / "cpufreq" / "scaling_governor"
        if governor_file.exists():
            try:
                cpu_num = int(cpu_dir.name.replace("cpu", ""))
                governors[cpu_num] = governor_file.read_text().strip()
            except (ValueError, PermissionError):
                pass
    
    return governors


def set_performance_mode() -> bool:
    """
    Set all CPUs to 'performance' governor.
    Requires root privileges.
    
    Command: sudo cpupower frequency-set -g performance
    """
    if os.geteuid() != 0:
        print("ERROR: Root privileges required. Run with: sudo python controlled_env.py --set-performance")
        return False
    
    try:
        # Try cpupower first
        result = subprocess.run(
            ["cpupower", "frequency-set", "-g", "performance"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ CPU governor set to 'performance' mode")
            return True
        else:
            print(f"cpupower failed: {result.stderr}")
    except FileNotFoundError:
        print("cpupower not found. Trying direct sysfs write...")
    
    # Fallback: Direct sysfs write
    try:
        cpu_dirs = sorted(Path("/sys/devices/system/cpu").glob("cpu[0-9]*"))
        for cpu_dir in cpu_dirs:
            governor_file = cpu_dir / "cpufreq" / "scaling_governor"
            if governor_file.exists():
                governor_file.write_text("performance")
        print("✓ CPU governor set to 'performance' via sysfs")
        return True
    except Exception as e:
        print(f"Failed to set governor: {e}")
        return False


def check_environment() -> Dict[str, any]:
    """
    Check current benchmark environment state.
    Returns dict with all relevant settings.
    """
    env_info = {
        "platform": sys.platform,
        "cpu_governor": get_cpu_governor(),
        "cpu_governors_all": get_all_cpu_governors(),
        "is_performance_mode": False,
        "warnings": [],
    }
    
    # Check if on Linux
    if sys.platform != "linux":
        env_info["warnings"].append(f"Not on Linux ({sys.platform}). CPU governor control not available.")
        return env_info
    
    # Check governor
    governor = env_info["cpu_governor"]
    if governor is None:
        env_info["warnings"].append("CPU frequency scaling not detected (may be running in VM)")
    elif governor != "performance":
        env_info["is_performance_mode"] = False
        env_info["warnings"].append(
            f"CPU governor is '{governor}', not 'performance'. "
            "Run: sudo cpupower frequency-set -g performance"
        )
    else:
        env_info["is_performance_mode"] = True
    
    # Check for background GPU processes
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-compute-apps=pid,name", "--format=csv,noheader"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            env_info["gpu_processes"] = result.stdout.strip().split("\n")
            env_info["warnings"].append(
                f"GPU processes detected: {env_info['gpu_processes']}. Consider stopping them."
            )
        else:
            env_info["gpu_processes"] = []
    except FileNotFoundError:
        env_info["gpu_processes"] = None
        env_info["warnings"].append("nvidia-smi not found. Cannot check GPU state.")
    
    return env_info


def print_environment_report():
    """Print a formatted environment report."""
    print("\n" + "=" * 60)
    print("BENCHMARK ENVIRONMENT CHECK")
    print("=" * 60)
    
    env = check_environment()
    
    print(f"\nPlatform: {env['platform']}")
    print(f"CPU Governor: {env['cpu_governor']}")
    
    if env.get("cpu_governors_all"):
        governors = set(env["cpu_governors_all"].values())
        if len(governors) == 1:
            print(f"All CPUs: {list(governors)[0]}")
        else:
            print(f"CPUs: {env['cpu_governors_all']}")
    
    if env["is_performance_mode"]:
        print("\n✓ Environment is optimized for benchmarking")
    else:
        print("\n⚠️  Environment may have variance issues:")
        for warning in env["warnings"]:
            print(f"  - {warning}")
    
    print("=" * 60)
    
    return env


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Controlled Environment Setup for Benchmarks (M2 T3)"
    )
    
    parser.add_argument(
        "--check", "-c",
        action="store_true",
        help="Check current environment state"
    )
    
    parser.add_argument(
        "--set-performance", "-p",
        action="store_true",
        help="Set CPU to performance governor (requires sudo)"
    )
    
    args = parser.parse_args()
    
    if args.set_performance:
        set_performance_mode()
    
    if args.check or not args.set_performance:
        print_environment_report()


if __name__ == "__main__":
    main()
