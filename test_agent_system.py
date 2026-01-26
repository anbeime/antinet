#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
8-Agent 系统测试脚本
测试 Agent 系统、技能系统和共享记忆系统
"""
import requests
import json
import time
from typing import Dict, Any

API_BASE = "http://localhost:8000"


def print_section(title: str):
    """打印分节标题"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_result(result: Any, title: str = "结果"):
    """打印结果"""
    print(f"\n{title}:")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def test_agent_status():
    """测试 Agent 状态"""
    print_section("测试 1: 获取 Agent 状态")
    
    try:
        response = requests.get(f"{API_BASE}/api/agent/status")
        response.raise_for_status()
        result = response.json()
        
        print_result(result)
        print(f"Agent 系统初始化: {result['system_initialized']}")
        print(f"Agent 数量: {result['agent_count']}")
        print(f"活跃任务: {result['active_tasks']}")
        
        return result
    except Exception as e:
        print(f" 获取 Agent 状态失败: {e}")
        return None


def test_agent_analyze():
    """测试 Agent 分析功能"""
    print_section("测试 2: 使用 8-Agent 系统进行分析")
    
    try:
        request_data = {
            "query": "分析最近的股市数据趋势",
            "priority": "high"
        }
        
        print(f"请求: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
        
        response = requests.post(
            f"{API_BASE}/api/agent/analyze",
            json=request_data,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        print(f"\n分析完成")
        print(f"   报告 ID: {result['report_id']}")
        print(f"   摘要: {result['summary']}")
        print(f"   生成卡片数: {len(result['cards'])}")
        
        # 显示卡片详情
        for card in result['cards']:
            print(f"\n   卡片 {card['card_type'].upper()}:")
            print(f"   - 标题: {card['title']}")
            print(f"   - 类别: {card['category']}")
            print(f"   - 内容: {card['content'][:80]}...")
        
        return result
    except Exception as e:
        print(f" 分析失败: {e}")
        return None


def test_memory_operations():
    """测试记忆系统操作"""
    print_section("测试 3: 共享记忆系统")
    
    try:
        # 存储知识
        print("\n[存储知识]")
        store_data = {
            "title": "测试知识",
            "content": "这是一个测试知识内容",
            "metadata": {"source": "test", "priority": "high"}
        }
        
        response = requests.post(
            f"{API_BASE}/api/agent/memory/store?knowledge_type=fact",
            json=store_data
        )
        response.raise_for_status()
        store_result = response.json()
        print_result(store_result, "存储结果")
        knowledge_id = store_result.get('id')
        
        # 检索知识
        print("\n[检索知识]")
        response = requests.get(
            f"{API_BASE}/api/agent/memory/retrieve?knowledge_type=fact&query=测试&limit=5"
        )
        response.raise_for_status()
        retrieve_result = response.json()
        print_result(retrieve_result, "检索结果")
        
        print(f"记忆系统正常工作")
        
        return retrieve_result
    except Exception as e:
        print(f" 记忆系统测试失败: {e}")
        return None


def test_skill_system():
    """测试技能系统"""
    print_section("测试 4: 技能系统")
    
    try:
        # 获取技能列表
        print("\n[列出所有技能]")
        response = requests.get(f"{API_BASE}/skill/list")
        response.raise_for_status()
        skills_result = response.json()
        print(f"总技能数: {skills_result['total']}")
        
        # 显示部分技能
        for i, skill in enumerate(skills_result['skills'][:5]):
            print(f"  {i+1}. {skill['name']} - {skill['agent_name']}")
        
        # 获取技能类别
        print("\n[获取技能类别]")
        response = requests.get(f"{API_BASE}/skill/categories")
        response.raise_for_status()
        categories_result = response.json()
        
        for cat in categories_result['categories']:
            print(f"  {cat['category']}: {cat['skill_count']} 个技能")
        
        # 执行技能
        print("\n[执行技能: data_cleaning]")
        execute_data = {
            "skill_name": "data_cleaning",
            "parameters": {
                "data": [
                    {"name": "test1", "value": 100},
                    {"name": "test2", "value": None},
                    {"name": "test3", "value": "  hello  "}
                ]
            }
        }
        
        response = requests.post(
            f"{API_BASE}/skill/execute",
            json=execute_data
        )
        response.raise_for_status()
        execute_result = response.json()
        print_result(execute_result, "执行结果")
        
        print(f"技能系统正常工作")
        
        return execute_result
    except Exception as e:
        print(f" 技能系统测试失败: {e}")
        return None


def test_get_cards():
    """测试获取卡片"""
    print_section("测试 5: 获取四色卡片")
    
    try:
        response = requests.get(f"{API_BASE}/api/agent/cards")
        response.raise_for_status()
        result = response.json()
        
        print(f"总卡片数: {result['total']}")
        
        if result['cards']:
            print("\n前 3 个卡片:")
            for i, card in enumerate(result['cards'][:3]):
                print(f"  {i+1}. [{card['card_type']}] {card['title']}")
        
        print(f"卡片系统正常工作")
        
        return result
    except Exception as e:
        print(f" 获取卡片失败: {e}")
        return None


def test_system_stats():
    """测试系统统计"""
    print_section("测试 6: 系统统计信息")
    
    try:
        response = requests.get(f"{API_BASE}/api/agent/stats")
        response.raise_for_status()
        result = response.json()
        
        print(f"总卡片数: {result['total_cards']}")
        print(f"各类型卡片:")
        for card_type, count in result['cards_by_type'].items():
            print(f"  {card_type}: {count}")
        
        print(f"\nAgent 状态:")
        for agent, status in result['agent_status'].items():
            print(f"  {agent}: {status}")
        
        print(f"统计系统正常工作")
        
        return result
    except Exception as e:
        print(f" 获取统计信息失败: {e}")
        return None


def run_all_tests():
    """运行所有测试"""
    print("\n" + "" * 30)
    print("  8-Agent 系统完整测试")
    print("" * 30)
    
    results = {}
    
    # 测试 1: Agent 状态
    results['agent_status'] = test_agent_status()
    time.sleep(1)
    
    # 测试 2: Agent 分析
    results['analyze'] = test_agent_analyze()
    time.sleep(1)
    
    # 测试 3: 记忆系统
    results['memory'] = test_memory_operations()
    time.sleep(1)
    
    # 测试 4: 技能系统
    results['skills'] = test_skill_system()
    time.sleep(1)
    
    # 测试 5: 获取卡片
    results['cards'] = test_get_cards()
    time.sleep(1)
    
    # 测试 6: 系统统计
    results['stats'] = test_system_stats()
    
    # 总结
    print_section("测试总结")
    
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v is not None)
    
    print(f"总测试数: {total_tests}")
    print(f"通过测试: {passed_tests}")
    print(f"失败测试: {total_tests - passed_tests}")
    
    if passed_tests == total_tests:
        print("\n所有测试通过！8-Agent 系统工作正常。")
    else:
        print(f"\n  {total_tests - passed_tests} 个测试失败，请检查。")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    run_all_tests()
