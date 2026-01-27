#!/usr/bin/env python3
"""
测试所有修复是否生效
"""
import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_api(name: str, method: str, endpoint: str, data: Dict[str, Any] = None) -> bool:
    """测试单个 API 端点"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=data, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            print(f"  ✗ {name}: 不支持的方法 {method}")
            return False
        
        if response.status_code == 200:
            print(f"  ✓ {name}: 成功 (200)")
            return True
        elif response.status_code == 404:
            print(f"  ✗ {name}: 端点不存在 (404)")
            return False
        elif response.status_code == 422:
            print(f"  ✗ {name}: 参数错误 (422)")
            print(f"    详情: {response.json()}")
            return False
        elif response.status_code == 500:
            print(f"  ✗ {name}: 服务器错误 (500)")
            print(f"    详情: {response.json()}")
            return False
        else:
            print(f"  ? {name}: 状态码 {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"  ✗ {name}: 无法连接到服务器")
        return False
    except requests.exceptions.Timeout:
        print(f"  ✗ {name}: 请求超时")
        return False
    except Exception as e:
        print(f"  ✗ {name}: {e}")
        return False


def main():
    print("=" * 60)
    print("AntiNet 修复验证测试")
    print("=" * 60)
    print()
    
    # 检查服务器是否运行
    print("[0] 检查服务器状态...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("  ✓ 服务器运行正常")
        else:
            print("  ✗ 服务器响应异常")
            return
    except:
        print("  ✗ 服务器未运行，请先启动: python backend/main.py")
        return
    
    print()
    
    # 测试结果统计
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    # ==================== 1. 测试知识库 API ====================
    print("[1] 测试知识库 API...")
    
    tests = [
        ("获取知识卡片列表", "GET", "/api/knowledge/cards", None),
        ("获取知识卡片（带过滤）", "GET", "/api/knowledge/cards", {"card_type": "blue", "limit": 10}),
        ("搜索知识库", "POST", "/api/knowledge/search", {"query": "测试", "limit": 5}),
        ("获取知识图谱", "GET", "/api/knowledge/graph", {"limit": 50}),
    ]
    
    for name, method, endpoint, data in tests:
        results["total"] += 1
        if test_api(name, method, endpoint, data):
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    print()
    
    # ==================== 2. 测试技能系统 API ====================
    print("[2] 测试技能系统 API...")
    
    tests = [
        ("列出所有技能", "GET", "/api/skills/list", None),
        ("获取技能分类", "GET", "/api/skills/categories", None),
        ("获取技能统计", "GET", "/api/skills/stats", None),
    ]
    
    for name, method, endpoint, data in tests:
        results["total"] += 1
        if test_api(name, method, endpoint, data):
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    print()
    
    # ==================== 3. 测试 Agent 系统 API ====================
    print("[3] 测试 Agent 系统 API...")
    
    tests = [
        ("获取 Agent 状态", "GET", "/api/agents/status", None),
        ("列出所有 Agent", "GET", "/api/agents/list", None),
    ]
    
    for name, method, endpoint, data in tests:
        results["total"] += 1
        if test_api(name, method, endpoint, data):
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    print()
    
    # ==================== 4. 测试 NPU 性能 ====================
    print("[4] 测试 NPU 性能...")
    
    # 注意：性能测试可能需要较长时间
    print("  → 运行性能基准测试（可能需要 30-60 秒）...")
    
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/npu/benchmark", timeout=120)
        elapsed = time.time() - start_time
        
        results["total"] += 1
        
        if response.status_code == 200:
            data = response.json()
            avg_latency = data.get("overall_avg_latency_ms", 0)
            meets_target = data.get("meets_target", False)
            
            print(f"  ✓ 性能基准测试完成")
            print(f"    - 平均延迟: {avg_latency:.2f}ms")
            print(f"    - 目标: <500ms")
            print(f"    - 达标: {'是' if meets_target else '否'}")
            print(f"    - 测试耗时: {elapsed:.1f}s")
            
            results["passed"] += 1
            
            if not meets_target:
                print()
                print("  ⚠️  NPU 性能未达标，可能原因:")
                print("    1. 未正确使用 NPU execution provider")
                print("    2. 模型未正确量化")
                print("    3. BURST 模式未启用")
                print("    4. 提示词过长或生成 token 数过多")
        elif response.status_code == 500:
            print(f"  ✗ 性能基准测试失败 (500)")
            error = response.json()
            print(f"    详情: {error.get('detail', 'Unknown error')}")
            results["failed"] += 1
        else:
            print(f"  ? 性能基准测试返回状态码 {response.status_code}")
            results["failed"] += 1
            
    except requests.exceptions.Timeout:
        print(f"  ✗ 性能基准测试超时（>120s）")
        results["total"] += 1
        results["failed"] += 1
    except Exception as e:
        print(f"  ✗ 性能基准测试异常: {e}")
        results["total"] += 1
        results["failed"] += 1
    
    print()
    
    # ==================== 总结 ====================
    print("=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"总测试数: {results['total']}")
    print(f"通过: {results['passed']} ✓")
    print(f"失败: {results['failed']} ✗")
    print(f"通过率: {results['passed']/results['total']*100:.1f}%")
    print()
    
    if results["failed"] == 0:
        print("🎉 所有测试通过！")
    else:
        print("⚠️  部分测试失败，请检查上述错误信息")
        print()
        print("常见问题排查:")
        print("  1. 数据库表缺失 → 运行 python fix_all_issues.py")
        print("  2. 路由 404 → 检查 backend/main.py 是否正确注册路由")
        print("  3. 参数错误 422 → 检查 Pydantic 模型定义")
        print("  4. NPU 性能问题 → 检查 QNN 日志和配置")
    print()


if __name__ == "__main__":
    main()
