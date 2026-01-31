import requests
import json

# 测试chat API
url = "http://localhost:8000/api/chat/query"
data = {
    "query": "Antinet",
    "conversation_history": []
}

try:
    response = requests.post(url, json=data)
    print(f"状态码: {response.status_code}")
    print(f"响应:")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
except Exception as e:
    print(f"错误: {e}")
