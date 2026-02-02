#!/usr/bin/env python3
"""
综合功能诊断脚本
测试前端调用的所有关键API端点
"""
import requests
import json
from typing import Dict, List, Tuple

BASE_URL = "http://localhost:8000"

# 测试用例列表
TEST_CASES = [
    {
        "name": "健康检查",
        "method": "GET",
        "endpoint": "/api/health",
        "expected_status": 200
    },
    {
        "name": "Agent状态",
        "method": "GET",
        "endpoint": "/api/agent/status",
        "expected_status": 200
    },
    {
        "name": "Agent历史",
        "method": "GET",
        "endpoint": "/api/agent/history",
        "expected_status": 200
    },
    {
        "name": "知识卡片",
        "method": "GET",
        "endpoint": "/api/agent/cards",
        "expected_status": 200
    },
    {
        "name": "团队成员",
        "method": "GET",
        "endpoint": "/api/data/team-members",
        "expected_status": 200
    },
    {
        "name": "知识空间",
        "method": "GET",
        "endpoint": "/api/data/knowledge-spaces",
        "expected_status": 200
    },
    {
        "name": "活动列表",
        "method": "GET",
        "endpoint": "/api/data/activities",
        "expected_status": 200
    },
    {
        "name": "技能列表",
        "method": "GET",
        "endpoint": "/api/skill/list",
        "expected_status": 200
    },
    {
        "name": "技能统计",
        "method": "GET",
        "endpoint": "/api/skill/stats",
        "expected_status": 200
    },
    {
        "name": "Agent统计",
        "method": "GET",
        "endpoint": "/api/agent/stats",
        "expected_status": 200
    },
    {
        "name": "聊天健康",
        "method": "GET",
        "endpoint": "/api/chat/health",
        "expected_status": 200
    },
    {
        "name": "NPU状态",
        "method": "GET",
        "endpoint": "/api/npu/status",
        "expected_status": 200
    }
]

def test_endpoint(test_case: Dict) -> Tuple[bool, str, any]:
    """测试单个API端点"""
    try:
        url = BASE_URL + test_case["endpoint"]
        method = test_case["method"]
        expected_status = test_case["expected_status"]

        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, timeout=5, json={})
        else:
            return False, "不支持的HTTP方法", None

        success = response.status_code == expected_status

        if success:
            try:
                data = response.json()
                return True, f"成功 (状态码: {response.status_code})", data
            except:
                return True, f"成功 (状态码: {response.status_code}, 非JSON响应)", None
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get("detail", response.text[:200])
            except:
                error_msg = response.text[:200]

            return False, f"失败 (状态码: {response.status_code})", error_msg

    except requests.exceptions.Timeout:
        return False, "超时 (5秒)", None
    except requests.exceptions.ConnectionError:
        return False, "连接失败 (后端未运行?)", None
    except Exception as e:
        return False, f"异常: {str(e)}", None

def main():
    """主函数"""
    print("=" * 80)
    print("Antinet 综合功能诊断")
    print("=" * 80)
    print()

    passed = 0
    failed = 0
    results = []

    for test_case in TEST_CASES:
        name = test_case["name"]
        endpoint = test_case["endpoint"]
        method = test_case["method"]

        print(f"测试: {name}")
        print(f"  端点: {method} {endpoint}")

        success, message, data = test_endpoint(test_case)

        if success:
            passed += 1
            print(f"  状态: [OK] {message}")
            if data:
                print(f"  数据: {json.dumps(data, ensure_ascii=False, indent=2)[:200]}")
        else:
            failed += 1
            print(f"  状态: [FAIL] {message}")
            if data:
                print(f"  错误: {data}")

        print()
        results.append({
            "name": name,
            "endpoint": endpoint,
            "success": success,
            "message": message
        })

    print("=" * 80)
    print("测试结果汇总")
    print("=" * 80)
    print(f"总计: {len(TEST_CASES)}")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    print(f"通过率: {passed/len(TEST_CASES)*100:.1f}%")
    print()

    if failed > 0:
        print("失败的端点:")
        for result in results:
            if not result["success"]:
                print(f"  ✗ {result['name']}: {result['message']}")

        print()
        print("建议修复措施:")
        print("  1. 检查后端服务是否正常运行 (python backend/main.py)")
        print("  2. 查看后端日志中的错误信息")
        print("  3. 确认数据库文件是否存在且有数据")
        print("  4. 检查前端是否使用了正确的API端点")
    else:
        print("✓ 所有API端点测试通过!")
        print("系统功能正常，可以开始使用。")

if __name__ == "__main__":
    main()
