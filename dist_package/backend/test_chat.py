import requests
import json

# Test chat endpoint
resp = requests.post(
    "http://localhost:8000/api/chat/enhanced/message",
    json={"message": "你好"},
    headers={"Content-Type": "application/json"}
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")