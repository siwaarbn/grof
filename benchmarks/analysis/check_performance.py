import pandas as pd 
from scipy import stats

baseline= "results/resnet50_analysis.py"
new="results/run_baseline_50.py"

baseline_df= pd.read_csv(baseline)
new_df=pd.read_csv(new)
baselinetime=baseline_df["time_ms"]
newtime= new_df["time_ms"]

baselinetimemean=baselinetime.mean()
newtimemean=newtime.mean()
print(f"performance regression test stats")
print(f"----------------------------------")
print(f"baseline_mean_time_ms{baselinetimemean:.3f}")
print(f"new_mean_time_ms{newtimemean:.3f}")

t_stat,p_value =stats.ttest_ind(
    baselinetime,
    newtime,
    equal_var=False
)
print(f"t_stat={t_stat:.3f}")
print(f"p_value={p_value:.6f}")

if(p_value<0.05):
    print(f"statistically significant")

elif(p_value>=0.05):
    print(f"statistically insignificant")
