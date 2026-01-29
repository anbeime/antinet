import requests
import json

# 测试聊天 API
url = "http://localhost:8000/api/chat/query"
data = {"query": "四色卡片"}

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
