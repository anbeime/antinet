#!/usr/bin/env python3
"""快速API测试"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

print("="*60)
print("快速API测试")
print("="*60)

# 1. 测试模型列表
print("\n[1/4] 测试 /api/npu/models")
try:
    response = requests.get(f"{BASE_URL}/api/npu/models", timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 成功 - 找到 {len(data)} 个模型")
        for model in data:
            print(f"   - {model.get('name', 'Unknown')}: {model.get('params', 'N/A')} 参数")
    else:
        print(f"❌ 失败 - 状态码: {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

# 2. 测试性能基准测试
print("\n[2/4] 测试 /api/npu/benchmark")
try:
    response = requests.get(f"{BASE_URL}/api/npu/benchmark", timeout=30)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 成功")
        print(f"   - 推理延迟: {data.get('inference_time_ms', 'N/A')} ms")
        print(f"   - 生成tokens: {data.get('tokens_generated', 'N/A')}")
        print(f"   - 加速比: {data.get('speedup', 'N/A')}x")
    else:
        print(f"❌ 失败 - 状态码: {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

# 3. 测试NPU分析（小查询）
print("\n[3/4] 测试 /api/npu/analyze")
try:
    response = requests.post(
        f"{BASE_URL}/api/npu/analyze",
        json={"query": "分析销售数据", "max_tokens": 32},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 成功")
        print(f"   - 卡片数量: {len(data.get('cards', []))}")
        print(f"   - 推理时间: {data.get('inference_time_ms', 'N/A')} ms")
    else:
        print(f"❌ 失败 - 状态码: {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

# 4. 测试数据接口
print("\n[4/4] 测试 /api/data/team-members")
try:
    response = requests.get(f"{BASE_URL}/api/data/team-members", timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 成功 - 团队成员数量: {len(data)}")
    else:
        print(f"❌ 失败 - 状态码: {response.status_code}")
except Exception as e:
    print(f"❌ 错误: {e}")

print("\n" + "="*60)
print("测试完成")
print("="*60)
