import time

def inner():
    time.sleep(0.01)

def middle():
    inner()

def outer():
    middle()

while True:
    outer()




