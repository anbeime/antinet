import requests

API_BASE = "http://localhost:8000"

# 测试 PDF 健康检查
print("1. Testing PDF health...")
try:
    response = requests.get(f"{API_BASE}/api/pdf/health", timeout=5)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {response.json()}")
    else:
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   Exception: {e}")

# 测试 PDF 状态
print("\n2. Testing PDF status...")
try:
    response = requests.get(f"{API_BASE}/api/pdf/status", timeout=5)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {response.json()}")
    else:
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   Exception: {e}")

# 测试 PDF 提取知识端点
print("\n3. Testing PDF extract knowledge endpoint...")
try:
    response = requests.get(f"{API_BASE}/api/pdf/extract/knowledge", timeout=5)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   Exception: {e}")

# 列出所有 PDF 相关的路由
print("\n4. Checking all routes...")
try:
    response = requests.get(f"{API_BASE}/docs", timeout=5)
    print(f"   Docs available at: {API_BASE}/docs")
except Exception as e:
    print(f"   Exception: {e}")
