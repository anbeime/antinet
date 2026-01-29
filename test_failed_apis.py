#!/usr/bin/env python3
"""测试失败的 API 端点"""

import requests
import sys

API_BASE = "http://localhost:8000"

# 测试 knowledge/stats
print("Testing /api/knowledge/stats...")
try:
    response = requests.get(f"{API_BASE}/api/knowledge/stats", timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success!")
        print(response.json())
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

print("\n" + "="*80 + "\n")

# 测试 data/activities
print("Testing /api/data/activities...")
try:
    response = requests.get(f"{API_BASE}/api/data/activities", timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success!")
        print(response.json())
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
