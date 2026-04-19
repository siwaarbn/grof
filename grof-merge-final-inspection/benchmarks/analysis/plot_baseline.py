import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("results/resnet50_baseline_times.csv")
mean_time = df["time_ms"].mean()
std_time = df["time_ms"].std()
var_time = df["time_ms"].var()
print("Baseline runtime statistics")
print("---------------------------")
print(f"Mean time (ms): {mean_time:.3f}")
print(f"Std deviation (ms): {std_time:.3f}")
print(f"Variance (ms^2): {var_time:.3f}")
plt.figure(figsize=(8, 5))
plt.hist(df["time_ms"], bins=15, edgecolor="black")
plt.axvline(mean_time, linestyle="--", linewidth=2, label="Mean")
plt.title("ResNet-50 Baseline Runtime Distribution")
plt.xlabel("Execution time (ms)")
plt.ylabel("Frequency")
plt.legend()
plt.savefig("results/resnet50_baseline_histogram.png")
plt.close()

print("Histogram saved to results/resnet50_baseline_histogram.png")
