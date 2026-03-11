import os
import json
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
TTL = 300  # 5 minutes

client = redis.from_url(REDIS_URL, decode_responses=True)

def get_cache(key: str):
    try:
        value = client.get(key)
        if value:
            return json.loads(value)
    except Exception:
        return None
    return None

def set_cache(key: str, value) -> None:
    try:
        client.setex(key, TTL, json.dumps(value))
    except Exception:
        pass

def invalidate_cache(pattern: str) -> None:
    try:
        keys = client.keys(pattern)
        if keys:
            client.delete(*keys)
    except Exception:
        pass
