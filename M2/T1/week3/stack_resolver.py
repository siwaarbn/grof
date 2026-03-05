import subprocess
import os

def resolve_stack(pid, addresses):
    """
    Resolve a list of instruction pointers to function names.
    """
    resolved = []

    maps = f"/proc/{pid}/maps"
    if not os.path.exists(maps):
        return resolved

    for addr in addresses:
        try:
            out = subprocess.check_output([
                "addr2line",
                "-f",
                "-p",
                "-e",
                f"/proc/{pid}/exe",
                hex(addr)
            ], stderr=subprocess.DEVNULL).decode().strip()

            if out:
                resolved.append(out)
        except Exception:
            continue

    return resolved
