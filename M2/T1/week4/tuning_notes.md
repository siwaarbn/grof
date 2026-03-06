# Tuning Notes

## Stack Trace Collection

Stack traces are collected using the BCC helper:

`stack_traces.get_stackid(ctx, BPF_F_USER_STACK)`

This allows capturing user-space call stacks when CUDA-related functions are triggered.

---

## Buffering

Events are sent to user space through a perf buffer:

`BPF_PERF_OUTPUT(correlation_events)`

This minimizes overhead and allows asynchronous event processing.

---

## Potential Optimizations
- Reduce stack depth if performance becomes an issue.
- Filter events by PID to avoid capturing unnecessary processes.
- Use batching when writing JSON output to reduce I/O overhead.

---

## Limitations
- Some stack frames may appear as ?? when symbols are unavailable.
- Stack resolution relies on addr2line, which can introduce latency.

---

## Future Improvements
- Resolve symbols for shared libraries.
- Add GPU kernel correlation using CUDA activity tracing.
