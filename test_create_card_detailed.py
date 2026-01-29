import requests
import json
import traceback

url = "http://localhost:8000/api/knowledge/cards"
data = {
    "card_type": "blue",
    "title": "API测试卡片",
    "content": "测试内容",
    "category": "事实"
}

print("发送请求...")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, ensure_ascii=False)}")
print()

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code != 200:
        print("\n详细错误信息:")
        try:
            error_detail = response.json()
            print(json.dumps(error_detail, ensure_ascii=False, indent=2))
        except:
            pass
            
except Exception as e:
    print(f"请求异常: {e}")
    traceback.print_exc()
