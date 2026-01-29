#!/usr/bin/env python3
from bcc import BPF
import os
import time
import signal

# ============================================================
# CONFIG
# ============================================================
PYTHON_BIN = "/usr/bin/python3"
PYTHON_SYM = "_PyEval_EvalFrameDefault"
TARGET_PID = int(os.environ.get("TARGET_PID", "0"))

# ============================================================
# BPF PROGRAM
# ============================================================
bpf_text = r"""
#include <uapi/linux/ptrace.h>

#define MAX_DEPTH 20
#define MAX_FUNC_NAME 32

struct _object {
    u64 ob_refcnt;
    u64 ob_type;
};

struct PyCompactUnicodeObject {
    struct _object ob_base;
    u64 length;
    u64 hash;
    u64 state;
    char *utf8;
};

struct PyCodeObject {
    struct _object ob_base;
    struct PyCompactUnicodeObject *co_name;
};

struct PyFrameObject {
    struct _object ob_base;
    struct PyFrameObject *f_back;
    struct PyCodeObject *f_code;
};

struct stack_key_t {
    u32 pid;
    u32 depth;
    char names[MAX_DEPTH][MAX_FUNC_NAME];
};

BPF_HASH(stack_counts, struct stack_key_t, u64, 16384);
BPF_PERCPU_ARRAY(stack_scratch, struct stack_key_t, 1);
BPF_ARRAY(target_pid, u32, 1);

static __always_inline int
read_py_name(struct PyCompactUnicodeObject *u, char *out)
{
    if (!u)
        return 0;

    char *utf8 = NULL;
    bpf_probe_read_user(&utf8, sizeof(utf8), &u->utf8);
    if (!utf8)
        return 0;

    bpf_probe_read_user_str(out, MAX_FUNC_NAME, utf8);
    return 1;
}

int on_pyeval(struct pt_regs *ctx)
{
    u64 pid_tgid = bpf_get_current_pid_tgid();
    u32 pid = pid_tgid >> 32;

    u32 idx = 0;
    u32 *tp = target_pid.lookup(&idx);
    if (tp && *tp != 0 && pid != *tp)
        return 0;

    // ✅ Python 3.12: frame is ARG2 for _PyEval_EvalFrameDefault
    struct PyFrameObject *frame = NULL;
    bpf_probe_read_user(&frame, sizeof(frame),
                        (void *)PT_REGS_PARM2(ctx));
    if (!frame)
        return 0;

    u32 zero = 0;
    struct stack_key_t *key = stack_scratch.lookup(&zero);
    if (!key)
        return 0;

    __builtin_memset(key, 0, sizeof(*key));
    key->pid = pid;

    #pragma unroll
    for (int i = 0; i < MAX_DEPTH; i++) {
        if (!frame)
            break;

        char func[MAX_FUNC_NAME] = {};

        struct PyCodeObject *code = NULL;
        bpf_probe_read_user(&code, sizeof(code), &frame->f_code);

        if (code) {
            struct PyCompactUnicodeObject *name = NULL;
            bpf_probe_read_user(&name, sizeof(name), &code->co_name);
            if (name)
                read_py_name(name, func);
        }

        if (func[0] == 0)
            break;

        __builtin_memcpy(&key->names[i][0], func, MAX_FUNC_NAME);
        key->depth++;

        bpf_probe_read_user(&frame, sizeof(frame), &frame->f_back);
    }

    if (key->depth > 0) {
        u64 one = 1;
        u64 *val = stack_counts.lookup(key);
        if (val)
            __sync_fetch_and_add(val, 1);
        else
            stack_counts.update(key, &one);
    }

    return 0;
}
"""

# ============================================================
# USER SPACE
# ============================================================
bpf = BPF(text=bpf_text)
bpf.attach_uprobe(
    name=PYTHON_BIN,
    sym=PYTHON_SYM,
    fn_name="on_pyeval",
    pid=-1,
)

tp = bpf.get_table("target_pid")
tp[tp.Key(0)] = tp.Leaf(TARGET_PID)

counts = bpf.get_table("stack_counts")

def dump_top(n=10):
    items = list(counts.items())
    items.sort(key=lambda kv: kv[1].value, reverse=True)
    for k, v in items[:n]:
        stack = ";".join(
            k.names[i].decode("ascii", "ignore")
            for i in range(k.depth)
        )
        print(f"{stack} {v.value}")
    print("----")

def on_sigint(sig, frame):
    dump_top(30)
    raise SystemExit

signal.signal(signal.SIGINT, on_sigint)

print("Profiling Python stacks (Week 3). Ctrl-C to stop.")
while True:
    time.sleep(2)
    dump_top(10)
