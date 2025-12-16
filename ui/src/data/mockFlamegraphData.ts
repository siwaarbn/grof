export const mockFlamegraphData = {
    name: "root",
    value: 100,
    children: [
        {
            name: "train_epoch [Python]",
            value: 80,
            children: [
                {
                    name: "forward_pass [Python]",
                    value: 40,
                    children: [
                        { name: "conv2d_forward [CUDA]", value: 25, children: [] },
                        { name: "relu_kernel [CUDA]", value: 10, children: [] },
                        { name: "batch_norm [C++]", value: 5, children: [] },
                    ],
                },
                {
                    name: "backward_pass [Python]",
                    value: 30,
                    children: [
                        { name: "conv2d_backward [CUDA]", value: 20, children: [] },
                        { name: "relu_backward [CUDA]", value: 8, children: [] },
                        { name: "optimizer_step [C++]", value: 2, children: [] },
                    ],
                },
                {
                    name: "data_loading [Python]",
                    value:  10,
                    children: [],
                },
            ],
        },
        {
            name:  "validation [Python]",
            value: 15,
            children: [
                { name: "inference [CUDA]", value: 12, children: [] },
                { name: "metrics_computation [Python]", value: 3, children: [] },
            ],
        },
        {
            name: "logging [Python]",
            value:  5,
            children: [],
        },
    ],
};