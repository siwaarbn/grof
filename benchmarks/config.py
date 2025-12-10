BENCHMARK_CONFIG = {
    "micro_gemm": {
        "sizes": [512, 1024, 2048],
        "min_run_time":  1.0,
    },
    "micro_memcpy": {
        "num_elements": [1_000_000, 10_000_000],
        "min_run_time": 1.0,
    },
    "micro_launch": {
        "small_kernel_sizes": [1, 10, 100],
        "num_kernels": [10, 100],
        "min_run_time": 1.0,
    },
    "resnet50": {
        "batch_sizes": [1, 8, 32],
        "min_run_time":  1.0,
    },
    "bert": {
        "batch_sizes": [1, 8],
        "seq_length": 128,
        "min_run_time": 1.0,
    },
}

DEFAULT_ITERATIONS = 10
RESULTS_DIR = "results"