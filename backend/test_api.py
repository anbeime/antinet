#!/usr/bin/env python3
"""
Antinet后端API测试脚本
测试所有12个核心数据API端点以及健康检查、聊天机器人等功能
"""
import requests
import json
import sys
from typing import Dict, Any, List

BASE_URL = "http://localhost:8000"

def print_test_result(name: str, success: bool, details: str = ""):
    """打印测试结果"""
    status = "PASS" if success else " FAIL"
    print(f"{status} {name}")
    if details and not success:
        print(f"  详情: {details}")

def test_root():
    """测试根路径"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            return True, f"应用: {data.get('app', '未知')}, 版本: {data.get('version', '未知')}"
        else:
            return False, f"状态码: {response.status_code}"
    except Exception as e:
        return False, f"连接失败: {e}"

def test_health():
    """测试健康检查"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            data = response.json()
            status = data.get('status', 'unknown')
            model_loaded = data.get('model_loaded', False)
            return True, f"状态: {status}, 模型加载: {model_loaded}"
        else:
            return False, f"状态码: {response.status_code}"
    except Exception as e:
        return False, f"连接失败: {e}"

def test_team_members():
    """测试团队成员API"""
    results = []
    
    # 1. GET 所有团队成员
    try:
        response = requests.get(f"{BASE_URL}/api/data/team-members")
        if response.status_code == 200:
            members = response.json()
            results.append(f"✓ GET 成功，找到 {len(members)} 个成员")
        else:
            results.append(f"✗ GET 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ GET 异常: {e}")
        return False, "; ".join(results)
    
    # 2. POST 添加新成员
    new_member = {
        "name": "测试用户",
        "role": "测试工程师",
        "avatar": "🧪",
        "email": "test@example.com",
        "contribution": 50
    }
    try:
        response = requests.post(f"{BASE_URL}/api/data/team-members", json=new_member)
        if response.status_code == 200:
            member = response.json()
            member_id = member.get('id')
            results.append(f"✓ POST 成功，ID: {member_id}")
        else:
            results.append(f"✗ POST 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ POST 异常: {e}")
        return False, "; ".join(results)
    
    # 3. PUT 更新成员信息
    if member_id:
        update_data = {"name": "测试用户(更新)", "contribution": 75}
        try:
            response = requests.put(f"{BASE_URL}/api/data/team-members/{member_id}", json=update_data)
            if response.status_code == 200:
                results.append(f"✓ PUT 成功")
            else:
                results.append(f"✗ PUT 失败: {response.status_code}")
        except Exception as e:
            results.append(f"✗ PUT 异常: {e}")
    
    # 4. DELETE 删除成员
    if member_id:
        try:
            response = requests.delete(f"{BASE_URL}/api/data/team-members/{member_id}")
            if response.status_code == 200:
                results.append(f"✓ DELETE 成功")
            else:
                results.append(f"✗ DELETE 失败: {response.status_code}")
        except Exception as e:
            results.append(f"✗ DELETE 异常: {e}")
    
    return True, "; ".join(results)

def test_knowledge_spaces():
    """测试知识空间API"""
    results = []
    
    # 1. GET 所有知识空间
    try:
        response = requests.get(f"{BASE_URL}/api/data/knowledge-spaces")
        if response.status_code == 200:
            spaces = response.json()
            results.append(f"✓ GET 成功，找到 {len(spaces)} 个空间")
        else:
            results.append(f"✗ GET 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ GET 异常: {e}")
        return False, "; ".join(results)
    
    # 2. POST 添加新空间
    new_space = {
        "name": "测试知识空间",
        "description": "这是一个测试知识空间",
        "owner": "测试用户",
        "members": ["用户A", "用户B"],
        "is_public": True
    }
    try:
        response = requests.post(f"{BASE_URL}/api/data/knowledge-spaces", json=new_space)
        if response.status_code == 200:
            space = response.json()
            space_id = space.get('id')
            results.append(f"✓ POST 成功，ID: {space_id}")
        else:
            results.append(f"✗ POST 失败: {response.status_code}")
    except Exception as e:
        results.append(f"✗ POST 异常: {e}")
    
    return True, "; ".join(results)

def test_activities():
    """测试协作活动API"""
    results = []
    
    # 1. GET 最近活动
    try:
        response = requests.get(f"{BASE_URL}/api/data/activities?limit=5")
        if response.status_code == 200:
            activities = response.json()
            results.append(f"✓ GET 成功，找到 {len(activities)} 个活动")
        else:
            results.append(f"✗ GET 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ GET 异常: {e}")
        return False, "; ".join(results)
    
    # 2. POST 添加新活动
    new_activity = {
        "user_name": "测试用户",
        "action": "创建了测试",
        "content": "这是一个测试协作活动",
        "metadata": {"test": True}
    }
    try:
        response = requests.post(f"{BASE_URL}/api/data/activities", json=new_activity)
        if response.status_code == 200:
            results.append(f"✓ POST 成功")
        else:
            results.append(f"✗ POST 失败: {response.status_code}")
    except Exception as e:
        results.append(f"✗ POST 异常: {e}")
    
    return True, "; ".join(results)

def test_comments():
    """测试评论API"""
    results = []
    
    # 1. GET 评论（目标ID为1，通常是默认空间）
    try:
        response = requests.get(f"{BASE_URL}/api/data/comments/1?target_type=space")
        if response.status_code == 200:
            comments = response.json()
            results.append(f"✓ GET 成功，找到 {len(comments)} 个评论")
        else:
            results.append(f"✗ GET 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ GET 异常: {e}")
        return False, "; ".join(results)
    
    # 2. POST 添加新评论
    new_comment = {
        "user_name": "测试用户",
        "user_avatar": "🧪",
        "content": "这是一个测试评论",
        "target_id": 1,
        "target_type": "space",
        "parent_id": None
    }
    try:
        response = requests.post(f"{BASE_URL}/api/data/comments", json=new_comment)
        if response.status_code == 200:
            results.append(f"✓ POST 成功")
        else:
            results.append(f"✗ POST 失败: {response.status_code}")
    except Exception as e:
        results.append(f"✗ POST 异常: {e}")
    
    return True, "; ".join(results)

def test_analytics():
    """测试分析数据API"""
    results = []
    
    # 1. GET 分析数据（growth类别）
    try:
        response = requests.get(f"{BASE_URL}/api/data/analytics/growth")
        if response.status_code == 200:
            data = response.json()
            results.append(f"✓ GET growth 成功")
        else:
            results.append(f"✗ GET growth 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ GET growth 异常: {e}")
        return False, "; ".join(results)
    
    # 2. GET 分析数据（network类别）
    try:
        response = requests.get(f"{BASE_URL}/api/data/analytics/network")
        if response.status_code == 200:
            data = response.json()
            results.append(f"✓ GET network 成功")
        else:
            results.append(f"✗ GET network 失败: {response.status_code}")
            return False, "; ".join(results)
    except Exception as e:
        results.append(f"✗ GET network 异常: {e}")
        return False, "; ".join(results)
    
    # 3. PUT 更新分析数据（heatmap类别）
    update_data = {
        "data": [
            {"hour": "9:00", "activity": 85},
            {"hour": "10:00", "activity": 92},
            {"hour": "11:00", "activity": 78}
        ]
    }
    try:
        response = requests.put(f"{BASE_URL}/api/data/analytics/heatmap", json=update_data)
        if response.status_code == 200:
            results.append(f"✓ PUT heatmap 成功")
        else:
            results.append(f"✗ PUT heatmap 失败: {response.status_code}")
    except Exception as e:
        results.append(f"✗ PUT heatmap 异常: {e}")
    
    return True, "; ".join(results)

def test_chat_query():
    """测试聊天机器人查询"""
    try:
        request_data = {
            "query": "如何启动Antinet系统？",
            "conversation_history": [],
            "context": {}
        }
        response = requests.post(f"{BASE_URL}/api/chat/query", json=request_data)
        if response.status_code == 200:
            data = response.json()
            return True, f"回复长度: {len(data.get('response', ''))} 字符"
        else:
            return False, f"状态码: {response.status_code}"
    except Exception as e:
        return False, f"连接失败: {e}"

def test_chat_search():
    """测试聊天机器人卡片搜索"""
    try:
        request_data = {
            "query": "NPU",
            "card_type": "blue",
            "limit": 5
        }
        response = requests.post(f"{BASE_URL}/api/chat/search", json=request_data)
        if response.status_code == 200:
            data = response.json()
            return True, f"找到 {data.get('total', 0)} 张卡片"
        else:
            return False, f"状态码: {response.status_code}"
    except Exception as e:
        return False, f"连接失败: {e}"

def test_chat_cards():
    """测试聊天机器人类别卡片"""
    try:
        response = requests.get(f"{BASE_URL}/api/chat/cards?card_type=blue&limit=5")
        if response.status_code == 200:
            data = response.json()
            return True, f"蓝色卡片: {len(data.get('cards', []))} 张"
        else:
            return False, f"状态码: {response.status_code}"
    except Exception as e:
        return False, f"连接失败: {e}"

def test_chat_health():
    """测试聊天机器人健康检查"""
    try:
        response = requests.get(f"{BASE_URL}/api/chat/health")
        if response.status_code == 200:
            data = response.json()
            return True, f"状态: {data.get('status', 'unknown')}"
        else:
            return False, f"状态码: {response.status_code}"
    except Exception as e:
        return False, f"连接失败: {e}"

def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("Antinet后端API测试")
    print("=" * 60)
    
    tests = [
        ("根路径", test_root),
        ("健康检查", test_health),
        ("团队成员API", test_team_members),
        ("知识空间API", test_knowledge_spaces),
        ("协作活动API", test_activities),
        ("评论API", test_comments),
        ("分析数据API", test_analytics),
        ("聊天机器人查询", test_chat_query),
        ("聊天机器人搜索", test_chat_search),
        ("聊天机器人类别卡片", test_chat_cards),
        ("聊天机器人健康检查", test_chat_health),
    ]
    
    results = []
    for name, test_func in tests:
        success, details = test_func()
        results.append((name, success, details))
        print_test_result(name, success, details)
    
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)
    
    print(f"通过: {passed}/{total}")
    print(f" 失败: {total - passed}/{total}")
    
    # 打印失败详情
    failures = [(name, details) for name, success, details in results if not success]
    if failures:
        print("\n失败详情:")
        for name, details in failures:
            print(f"  {name}: {details}")
    
    return all(success for _, success, _ in results)

if __name__ == "__main__":
    print("提示：确保后端服务正在运行 (端口 8000)")
    print("运行: cd backend && python main.py")
    print("-" * 60)
    
    success = run_all_tests()
    
    if success:
        print("\n🎉 所有测试通过！后端API功能正常。")
    else:
        print("\n⚠️  部分测试失败，请检查后端服务和日志。")
        sys.exit(1)