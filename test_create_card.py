import requests
import json

# 测试创建卡片
url = "http://localhost:8000/api/knowledge/cards"
data = {
    "title": "测试卡片",
    "content": "这是一个真实的测试卡片",
    "card_type": "blue",
    "category": "事实"
}

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS - Card created!")
        print(f"Response: {response.json()}")
    else:
        print(f"FAILED - {response.text}")
except Exception as e:
    print(f"Error: {e}")

# 测试获取卡片列表
print("\n" + "="*50)
print("Testing GET cards...")
try:
    response = requests.get(f"{url}?limit=5", timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        cards = response.json()
        print(f"Total cards: {len(cards)}")
        if cards:
            print(f"Latest card: {cards[0].get('title', 'N/A')}")
    else:
        print(f"FAILED - {response.text}")
except Exception as e:
    print(f"Error: {e}")
