#!/usr/bin/env python3
"""
前后端连接测试脚本
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("前后端连接测试")
print("=" * 60)

# 测试1: 后端健康检查
print("\n[测试1] 后端健康检查...")
try:
    response = requests.get(f"{BASE_URL}/api/health", timeout=3)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 后端正常运行")
        print(f"   状态: {data.get('status')}")
        print(f"   模型: {data.get('model')}")
        print(f"   设备: {data.get('device')}")
    else:
        print(f"❌ 后端响应异常: {response.status_code}")
except Exception as e:
    print(f"❌ 无法连接后端: {e}")
    exit(1)

# 测试2: 聊天机器人
print("\n[测试2] 聊天机器人 API...")
try:
    response = requests.post(f"{BASE_URL}/api/chat/query", 
        json={"query": "你好", "conversation_history": [], "context": {}},
        timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 聊天机器人正常")
        print(f"   回复长度: {len(data.get('response', ''))}")
        print(f"   推荐问题数: {len(data.get('suggested_questions', []))}")
    else:
        print(f"⚠️  聊天机器人返回: {response.status_code}")
except Exception as e:
    print(f"❌ 聊天机器人测试失败: {e}")

# 测试3: 知识卡片列表
print("\n[测试3] 知识卡片列表...")
try:
    response = requests.get(f"{BASE_URL}/api/chat/cards?limit=5", timeout=3)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 知识卡片 API 正常")
        if 'cards' in data:
            print(f"   卡片数量: {len(data.get('cards', []))}")
        elif 'detail' in data:
            print(f"❌ 错误: {data.get('detail')}")
    else:
        print(f"⚠️  返回状态: {response.status_code}")
except Exception as e:
    print(f"❌ 知识卡片测试失败: {e}")

# 测试4: 数据分析（可能超时）
print("\n[测试4] 数据分析 API（预期超时）...")
try:
    start = time.time()
    response = requests.post(f"{BASE_URL}/api/generate/cards",
        json={"query": "分析数据"},
        timeout=10)
    elapsed = (time.time() - start)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 数据分析正常 (耗时 {elapsed:.2f}秒)")
        print(f"   卡片数量: {len(data.get('cards', []))}")
    else:
        print(f"⚠️  数据分析返回: {response.status_code} (耗时 {elapsed:.2f}秒)")
except requests.exceptions.Timeout:
    print(f"⚠️  数据分析超时（符合预期，NPU 推理慢）")
except Exception as e:
    print(f"❌ 数据分析测试失败: {e}")

# 测试5: NPU 状态
print("\n[测试5] NPU 状态 API...")
try:
    response = requests.get(f"{BASE_URL}/api/npu/status", timeout=3)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ NPU 状态 API 正常")
        print(f"   设备: {data.get('device', 'N/A')}")
        print(f"   性能: {data.get('performance', 'N/A')}")
    else:
        print(f"⚠️  NPU 状态返回: {response.status_code}")
except Exception as e:
    print(f"❌ NPU 状态测试失败: {e}")

# 总结
print("\n" + "=" * 60)
print("测试总结")
print("=" * 60)
print("\n您现在可以:")
print("1. 打开浏览器访问 http://localhost:3000 查看前端")
print("2. 测试聊天机器人功能（右下角悬浮按钮）")
print("3. 查看新创建的 7 个功能页面")
print("\n已知问题:")
print("- 数据分析 API: NPU 推理超时 (12.5秒)")
print("- 知识卡片 API: 数据库连接错误")
print("- NPU 状态 API: 可能超时")
print("\n" + "=" * 60)
