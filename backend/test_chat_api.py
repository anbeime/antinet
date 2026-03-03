import requests
import json
import time

API = "http://localhost:8000"

print("=" * 50)
print("  测试聊天API")
print("=" * 50)

# 1. 测试健康检查
print("\n1. 健康检查...")
try:
    r = requests.get(f"{API}/api/chat/health", timeout=5)
    print(f"   状态: {r.status_code}")
    print(f"   响应: {r.json()}")
except Exception as e:
    print(f"   失败: {e}")

# 2. 测试聊天查询
print("\n2. 聊天查询 (卡片)...")
try:
    start = time.time()
    r = requests.post(f"{API}/api/chat/query", json={
        "query": "卡片",
        "conversation_history": [],
        "context": {}
    }, timeout=120)
    elapsed = time.time() - start
    data = r.json()
    print(f"   状态: {r.status_code}")
    print(f"   耗时: {elapsed:.2f}秒")
    print(f"   回复长度: {len(data.get('response', ''))}")
    print(f"   卡片数: {len(data.get('cards', []))}")
    print(f"   回复前100字: {data.get('response', '')[:100]}")
except Exception as e:
    print(f"   失败: {e}")

# 3. 测试搜索
print("\n3. 卡片搜索...")
try:
    start = time.time()
    r = requests.post(f"{API}/api/chat/search", json={
        "query": "项目管理",
        "limit": 5
    }, timeout=10)
    elapsed = time.time() - start
    data = r.json()
    print(f"   状态: {r.status_code}")
    print(f"   耗时: {elapsed:.2f}秒")
    print(f"   卡片数: {len(data.get('cards', []))}")
except Exception as e:
    print(f"   失败: {e}")

# 4. 测试视觉接口
print("\n4. 视觉分析接口...")
try:
    r = requests.get(f"{API}/api/vision/health", timeout=5)
    print(f"   状态: {r.status_code}")
except Exception as e:
    print(f"   失败: {e}")

print("\n" + "=" * 50)
print("  测试完成")
print("=" * 50)
