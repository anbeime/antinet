import requests
import json

# Test /generate endpoint with real NPU
resp = requests.post(
    "http://localhost:8000/generate",
    json={"prompt": "用一句话介绍自己", "model": "llama3.2-3b", "max_tokens": 64},
    headers={"Content-Type": "application/json"},
    timeout=120
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")