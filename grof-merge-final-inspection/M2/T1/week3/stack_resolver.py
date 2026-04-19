import os
import subprocess


def get_python_frames(pid: int) -> list[str]:
    """
    Snapshot Python call stack for the given PID using py-spy dump.
    Returns list of frame strings like ['train', 'forward', 'conv2d'].
    """
    try:
        out = subprocess.check_output(
            ["/mnt/data/venvs/grof-env/bin/py-spy", "dump", "--pid", str(pid), "--nonblocking"],
            stderr=subprocess.DEVNULL,
            timeout=1,
        ).decode(errors="replace")
        frames = []
        for line in out.splitlines():
            line = line.strip()
            # py-spy dump lines look like:
            #   train (resnet50.py:42)
            #   forward (torch/nn/modules/module.py:1130)
            if line and not line.startswith("Thread") and "(" in line:
                # Extract just the function name before the first space
                name = line.split("(")[0].strip()
                if name:
                    frames.append(f"[Python] {name}")
        # py-spy lists innermost frame last — reverse so call order is
        # outermost→innermost to match native stack convention
        return list(reversed(frames))
    except Exception:
        return []


def resolve_stack(pid, addresses):
    """
    Resolve stack by reading Python frames directly from the target process
    using /proc/PID/maps + nm for native symbols.
    """
    resolved = []
    maps_path = f"/proc/{pid}/maps"
    if not os.path.exists(maps_path):
        return resolved

    # Parse memory segments
    segments = []
    try:
        with open(maps_path) as f:
            for line in f:
                parts = line.split()
                if len(parts) < 6:
                    continue
                addr_range = parts[0].split("-")
                start = int(addr_range[0], 16)
                end = int(addr_range[1], 16)
                path = parts[5] if len(parts) > 5 else ""
                segments.append((start, end, path))
    except Exception:
        return resolved

    for addr in addresses:
        found = False
        for start, end, lib_path in segments:
            if start <= addr < end:
                if not lib_path or not os.path.exists(lib_path):
                    resolved.append("??")
                    found = True
                    break
                offset = addr - start
                try:
                    out = subprocess.check_output(
                        ["nm", "-D", "--defined-only", lib_path],
                        stderr=subprocess.DEVNULL
                    ).decode()
                    best_name = None
                    best_sym_addr = 0
                    for sym_line in out.splitlines():
                        parts = sym_line.split()
                        if len(parts) < 3:
                            continue
                        try:
                            sym_addr = int(parts[0], 16)
                        except ValueError:
                            continue
                        if sym_addr <= offset and sym_addr > best_sym_addr:
                            best_sym_addr = sym_addr
                            best_name = parts[2]
                    if best_name:
                        try:
                            demangled = subprocess.check_output(
                                ["c++filt", best_name],
                                stderr=subprocess.DEVNULL
                            ).decode().strip()
                            resolved.append(demangled)
                        except Exception:
                            resolved.append(best_name)
                    else:
                        lib_base = os.path.basename(lib_path)
                        resolved.append(f"{lib_base}+0x{offset:x}")
                except Exception:
                    lib_base = os.path.basename(lib_path)
                    resolved.append(f"{lib_base}+0x{offset:x}")
                found = True
                break
        if not found:
            resolved.append("??")
    return resolved
