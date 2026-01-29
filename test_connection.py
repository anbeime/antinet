#!/usr/bin/env python3
"""
前后端连接测试脚本（使用 urllib，不需要额外依赖）
"""
import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("前后端连接测试")
print("=" * 60)

def test_health():
    """测试后端健康检查"""
    print("\n[测试1] 后端健康检查...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=3) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"[OK] 后端正常运行")
            print(f"   状态: {data.get('status')}")
            print(f"   模型: {data.get('model')}")
            print(f"   设备: {data.get('device')}")
            return True
    except Exception as e:
        print(f"[ERROR] 无法连接后端: {e}")
        return False

def test_chat():
    """测试聊天机器人"""
    print("\n[测试2] 聊天机器人 API...")
    try:
        data = json.dumps({"query": "你好", "conversation_history": [], "context": {}}).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/chat/query", data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] 聊天机器人正常")
            print(f"   回复长度: {len(result.get('response', ''))} 字符")
            print(f"   推荐问题数: {len(result.get('suggested_questions', []))}")
            return True
    except Exception as e:
        print(f"[ERROR] 聊天机器人测试失败: {e}")
        return False

def test_cards():
    """测试知识卡片"""
    print("\n[测试3] 知识卡片列表...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/chat/cards?limit=5", timeout=3) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] 知识卡片 API 响应正常")
            if 'cards' in result:
                print(f"   卡片数量: {len(result.get('cards', []))}")
            elif 'detail' in result:
                print(f"[ERROR] 错误: {result.get('detail')}")
            return True
    except Exception as e:
        print(f"[ERROR] 知识卡片测试失败: {e}")
        return False

def test_data_analysis():
    """测试数据分析（可能超时）"""
    print("\n[测试4] 数据分析 API（预期超时）...")
    try:
        data = json.dumps({"query": "分析数据"}).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/generate/cards", data=data, headers={'Content-Type': 'application/json'})
        start = time.time()
        with urllib.request.urlopen(req, timeout=10) as response:
            elapsed = time.time() - start
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] 数据分析正常 (耗时 {elapsed:.2f}秒)")
            print(f"   卡片数量: {len(result.get('cards', []))}")
            return True
    except urllib.error.URLError as e:
        if 'timeout' in str(e).lower():
            print(f"[WARNING] 数据分析超时（符合预期，NPU 推理慢）")
            return False
        else:
            print(f"[ERROR] 数据分析测试失败: {e}")
            return False
    except Exception as e:
        print(f"[ERROR] 数据分析测试失败: {e}")
        return False

def test_npu_status():
    """测试 NPU 状态"""
    print("\n[测试5] NPU 状态 API...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/npu/status", timeout=3) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] NPU 状态 API 正常")
            print(f"   设备: {result.get('device', 'N/A')}")
            print(f"   性能: {result.get('performance', 'N/A')}")
            return True
    except Exception as e:
        print(f"[ERROR] NPU 状态测试失败: {e}")
        return False

# 运行所有测试
results = {
    '后端健康': test_health(),
    '聊天机器人': test_chat(),
    '知识卡片': test_cards(),
    '数据分析': test_data_analysis(),
    'NPU状态': test_npu_status(),
}

# 总结
print("\n" + "=" * 60)
print("测试总结")
print("=" * 60)

passed = sum(1 for v in results.values() if v)
total = len(results)

print(f"\n通过: {passed}/{total}")

for test_name, result in results.items():
    status = "[OK]" if result else "[FAIL]"
    print(f"{status} {test_name}")

print("\n" + "=" * 60)
print("现在可以:")
print("1. 打开浏览器访问 http://localhost:3000")
print("2. 测试聊天机器人功能（右下角悬浮按钮）")
print("3. 查看新创建的 7 个功能页面")
print("\n已知问题:")
print("- 数据分析 API: NPU 推理超时")
print("- 知识卡片 API: 数据库连接错误")  
print("- NPU 状态 API: 可能超时")
print("=" * 60)
