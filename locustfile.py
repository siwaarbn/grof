from locust import HttpUser, task, between

class GrofUser(HttpUser):
    wait_time = between(1, 2)

    @task(3)
    def get_flamegraph(self):
        self.client.get("/api/v1/sessions/1/flamegraph")

    @task(3)
    def get_correlated_events(self):
        self.client.get("/api/v1/sessions/1/correlated-events")

    @task(2)
    def get_critical_path(self):
        self.client.get("/api/v1/sessions/1/critical-path")

    @task(2)
    def get_functions(self):
        self.client.get("/api/v1/sessions/1/functions")

    @task(1)
    def get_timeline(self):
        self.client.get("/api/v1/sessions/1/timeline?start=0&end=9999999999999999999")

    @task(1)
    def list_sessions(self):
        self.client.get("/api/v1/sessions")
