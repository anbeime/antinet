#!/usr/bin/env python3
"""API端点测试脚本"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, method="GET", data=None):
    """测试API端点"""
    print(f"\n{'='*60}")
    print(f"测试: {name}")
    print(f"URL: {url}")
    print(f"方法: {method}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            print(f"❌ 不支持的方法: {method}")
            return False

        if response.status_code == 200:
            print(f"✅ 状态码: {response.status_code}")
            print(f"响应: {response.json() if 'application/json' in response.headers.get('content-type', '') else response.text[:100]}")
            return True
        else:
            print(f"❌ 状态码: {response.status_code}")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def main():
    print("="*60)
    print("Antinet 后端API测试")
    print("="*60)
    print(f"基础URL: {BASE_URL}")
    print("请确保后端服务已启动")
    print("="*60)

    # 等待后端启动
    print("\n等待后端启动...")
    time.sleep(2)

    tests = [
        ("健康检查", f"{BASE_URL}/health", "GET"),
        ("API文档", f"{BASE_URL}/docs", "GET"),
        ("知识节点列表", f"{BASE_URL}/api/knowledge/nodes", "GET"),
        ("知识边列表", f"{BASE_URL}/api/knowledge/edges", "GET"),
        ("卡片列表", f"{BASE_URL}/api/cards", "GET"),
        ("技能列表", f"{BASE_URL}/api/skills", "GET"),
        ("技能广场", f"{BASE_URL}/api/skills/skill_plaza", "GET"),
    ]

    passed = 0
    failed = 0

    for name, url, method in tests:
        if test_endpoint(name, url, method):
            passed += 1
        else:
            failed += 1
        time.sleep(0.5)

    print(f"\n{'='*60}")
    print("测试总结")
    print(f"{'='*60}")
    print(f"✅ 通过: {passed}")
    print(f"❌ 失败: {failed}")
    print(f"总计: {passed + failed}")
    print(f"{'='*60}")

    if failed == 0:
        print("\n🎉 所有测试通过！")
    else:
        print(f"\n⚠️  有 {failed} 个测试失败，请检查后端日志")

if __name__ == "__main__":
    main()
