"""
Memory Profiler - Track peak memory usage during benchmark execution.
Uses /usr/bin/time -v on Linux or resource module as fallback.
"""

import subprocess
import re
import sys
import os
from typing import List, Dict, Any, Optional


def measure_memory_linux(cmd: List[str], cwd: Optional[str] = None) -> Dict[str, Any]:
    """
    Measure peak memory using /usr/bin/time -v (GNU time).
    
    Args:
        cmd: Command to run
        cwd: Working directory
        
    Returns:
        Dict with peak_memory_mb, elapsed_ms, success
    """
    time_cmd = ["/usr/bin/time", "-v"] + cmd
    
    try:
        result = subprocess.run(
            time_cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        
        # Parse "Maximum resident set size (kbytes): 123456"
        match = re.search(
            r"Maximum resident set size.*?:\s*(\d+)",
            result.stderr
        )
        peak_kb = int(match.group(1)) if match else 0
        
        # Parse elapsed time if available
        time_match = re.search(
            r"Elapsed \(wall clock\) time.*?:\s*([\d:.]+)",
            result.stderr
        )
        
        return {
            "peak_memory_mb": peak_kb / 1024,
            "peak_memory_kb": peak_kb,
            "success": result.returncode == 0,
            "returncode": result.returncode,
        }
        
    except FileNotFoundError:
        print("GNU time not found. Install with: apt install time")
        return {
            "peak_memory_mb": 0.0,
            "peak_memory_kb": 0,
            "success": False,
            "error": "GNU time not found",
        }
    except subprocess.TimeoutExpired:
        return {
            "peak_memory_mb": 0.0,
            "peak_memory_kb": 0,
            "success": False,
            "error": "Timeout",
        }
    except Exception as e:
        return {
            "peak_memory_mb": 0.0,
            "peak_memory_kb": 0,
            "success": False,
            "error": str(e),
        }


def measure_memory_macos(cmd: List[str], cwd: Optional[str] = None) -> Dict[str, Any]:
    """
    Measure peak memory on macOS using /usr/bin/time -l.
    
    Args:
        cmd: Command to run
        cwd: Working directory
        
    Returns:
        Dict with peak_memory_mb, success
    """
    time_cmd = ["/usr/bin/time", "-l"] + cmd
    
    try:
        result = subprocess.run(
            time_cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        
        # Parse "123456  maximum resident set size"
        match = re.search(
            r"(\d+)\s+maximum resident set size",
            result.stderr
        )
        # macOS reports in bytes
        peak_bytes = int(match.group(1)) if match else 0
        peak_kb = peak_bytes / 1024
        
        return {
            "peak_memory_mb": peak_kb / 1024,
            "peak_memory_kb": peak_kb,
            "success": result.returncode == 0,
            "returncode": result.returncode,
        }
        
    except Exception as e:
        return {
            "peak_memory_mb": 0.0,
            "peak_memory_kb": 0,
            "success": False,
            "error": str(e),
        }


def measure_memory(cmd: List[str], cwd: Optional[str] = None) -> Dict[str, Any]:
    """
    Cross-platform peak memory measurement.
    
    Args:
        cmd: Command to run
        cwd: Working directory
        
    Returns:
        Dict with peak_memory_mb, success
    """
    if sys.platform == "linux":
        return measure_memory_linux(cmd, cwd)
    elif sys.platform == "darwin":
        return measure_memory_macos(cmd, cwd)
    else:
        print(f"Platform {sys.platform} not supported for memory profiling")
        return {
            "peak_memory_mb": 0.0,
            "peak_memory_kb": 0,
            "success": False,
            "error": f"Unsupported platform: {sys.platform}",
        }


def format_memory(mb: float) -> str:
    """Format memory size as human-readable string."""
    if mb >= 1024:
        return f"{mb/1024:.2f} GB"
    elif mb >= 1:
        return f"{mb:.2f} MB"
    else:
        return f"{mb*1024:.2f} KB"


if __name__ == "__main__":
    # Test memory measurement
    print("Testing memory profiler...")
    
    # Simple test command
    result = measure_memory(["python3", "-c", "x = [i for i in range(1000000)]; print(len(x))"])
    
    print(f"Peak Memory: {format_memory(result['peak_memory_mb'])}")
    print(f"Success: {result['success']}")
