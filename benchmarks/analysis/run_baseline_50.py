import csv 
import time 
import subprocess
out_csv= "results/resnet50_baseline_times.csv"
Run= 50 
with open ( out_csv , "w" , newline="")as f : 
    writer= csv.writer(f) 
    writer.writerow(["run_id","time_ms"])

for i in range(Run):
    print (f"Run {i+1} ")
    start= time.perf_counter()
    subprocess.run(["python","macro_benchmarks/resnet50.py"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check= True )
    end=time.perf_counter()
    runtime=(end-start) *1000 
    with open ( out_csv , "a", newline="") as f: 
        writer=csv.writer(f) 
        writer.writerow([i+1,runtime])
    print (f"TIME: {runtime:.3f}ms ")

print ("baseline runs complete ") 
 
