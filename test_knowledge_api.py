#!/usr/bin/env python3
"""测试知识库 API 修复"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_search_api():
    """测试搜索 API"""
    print("=" * 60)
    print("测试知识库搜索 API")
    print("=" * 60)
    
    # 测试 POST 请求
    url = f"{BASE_URL}/api/knowledge/search"
    payload = {
        "keyword": "测试",
        "limit": 10
    }
    
    print(f"\n请求 URL: {url}")
    print(f"请求体: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应内容: {response.text[:500]}")
        
        if response.status_code == 200:
            print("\n✅ 搜索 API 测试通过！")
            return True
        else:
            print(f"\n❌ 搜索 API 测试失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")
        return False

def test_cards_api():
    """测试获取卡片 API"""
    print("\n" + "=" * 60)
    print("测试获取知识卡片 API")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/knowledge/cards"
    
    print(f"\n请求 URL: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应内容: {response.text[:500]}")
        
        if response.status_code == 200:
            print("\n✅ 获取卡片 API 测试通过！")
            return True
        else:
            print(f"\n❌ 获取卡片 API 测试失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")
        return False

def test_agent_status():
    """测试 Agent 状态 API"""
    print("\n" + "=" * 60)
    print("测试 Agent 状态 API")
    print("=" * 60)
    
    # 正确的路由是 /api/agent/status (单数)
    url = f"{BASE_URL}/api/agent/status"
    
    print(f"\n请求 URL: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应内容: {response.text[:500]}")
        
        if response.status_code == 200:
            print("\n✅ Agent 状态 API 测试通过！")
            return True
        else:
            print(f"\n❌ Agent 状态 API 测试失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")
        return False

def test_skill_list():
    """测试技能列表 API"""
    print("\n" + "=" * 60)
    print("测试技能列表 API")
    print("=" * 60)
    
    # 正确的路由是 /api/skill/list (单数)
    url = f"{BASE_URL}/api/skill/list"
    
    print(f"\n请求 URL: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应内容: {response.text[:500]}")
        
        if response.status_code == 200:
            print("\n✅ 技能列表 API 测试通过！")
            return True
        else:
            print(f"\n❌ 技能列表 API 测试失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")
        return False

if __name__ == "__main__":
    print("\n🔧 开始测试 API 修复...")
    
    results = []
    results.append(("知识库搜索", test_search_api()))
    results.append(("获取知识卡片", test_cards_api()))
    results.append(("Agent 状态", test_agent_status()))
    results.append(("技能列表", test_skill_list()))
    
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！")
    else:
        print(f"\n⚠️ {total - passed} 个测试失败")
