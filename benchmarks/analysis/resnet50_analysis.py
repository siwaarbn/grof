import pandas as pd 
df = pd.read_csv("results/resnet50_gpu_trace.csv")
start_column = "Start (ns)"
Duration_column = "Duration (ns)"
df = df.sort_values("Start (ns)").reset_index(drop=True)
df["duration_ms"]= df[Duration_column] / 1e6
average_kernel_duration=df["duration_ms"].mean()

df["end_ns"]= df[start_column]+df[Duration_column]

df["gap_ns"] = df[start_column].shift(-1)-df["end_ns"]
df["gap_ms"] = df["gap_ns"]/ 1e6
average_kernel_gap= df["gap_ms"].dropna().mean()
print ("ResNet-50 kernel analysis") 
print ("-----------------------------")
print ("Number of kernels ", len(df))
print ( "Average kernel duration (ms):" ,average_kernel_duration)
print ("Average kernel gap / CPU overhead (ms): " , average_kernel_gap)

