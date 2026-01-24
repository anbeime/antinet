#!/usr/bin/env python3
"""
测试新的API端点：检查清单和GTD任务
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/data"

def test_api(endpoint, method="GET", data=None):
    """测试API端点"""
    try:
        url = f"{BASE_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=5)
        elif method == "DELETE":
            response = requests.delete(url, timeout=5)
        
        print(f"{method} {endpoint}: {response.status_code}")
        if response.status_code in [200, 201]:
            try:
                return response.json()
            except:
                return response.text
        else:
            print(f"  错误: {response.text}")
            return None
    except Exception as e:
        print(f"[FAIL] {method} {endpoint} 失败: {e}")
        return None

def main():
    print("[TEST] 测试新的API端点\n")
    
    # 测试健康检查
    print("1. 健康检查:")
    health = test_api("/health", "GET")
    if health:
        print(f"   [OK] 后端运行正常: {health.get('status')}")
    
    # 测试检查清单API
    print("\n2. 检查清单API:")
    checklist = test_api("/checklist", "GET")
    if checklist:
        data = checklist.get('data', [])
        print(f"   [OK] 获取检查清单成功: {len(data)} 个部分")
        for section in data:
            print(f"      - {section.get('title')}: {len(section.get('items', []))} 个检查项")
    
    # 测试GTD任务API
    print("\n3. GTD任务API:")
    tasks = test_api("/gtd-tasks", "GET")
    if tasks:
        print(f"   [OK] 获取GTD任务成功: {len(tasks)} 个任务")
        
        # 按分类统计
        categories = {}
        for task in tasks:
            cat = task.get('category', 'unknown')
            categories[cat] = categories.get(cat, 0) + 1
        
        for cat, count in categories.items():
            print(f"      - {cat}: {count} 个任务")
    
    # 测试添加GTD任务
    print("\n4. 添加GTD任务:")
    new_task = {
        "title": "测试新任务",
        "description": "这是一个测试任务",
        "priority": "medium",
        "category": "inbox"
    }
    result = test_api("/gtd-tasks", "POST", new_task)
    if result:
        print(f"   [OK] 添加任务成功: {result.get('title')}")
        task_id = result.get('id')
        
        # 测试更新任务
        print("\n5. 更新GTD任务:")
        update_data = {"priority": "high"}
        update_result = test_api(f"/gtd-tasks/{task_id}", "PUT", update_data)
        if update_result:
            print(f"   [OK] 更新任务成功")
        
        # 测试删除任务
        print("\n6. 删除GTD任务:")
        delete_result = test_api(f"/gtd-tasks/{task_id}", "DELETE")
        if delete_result:
            print(f"   [OK] 删除任务成功")
    
    print("\n[DONE] 所有测试完成！")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n测试已取消")
    except Exception as e:
        print(f"\n[FAIL] 测试失败: {e}")
        print("请确保后端服务已启动: cd backend && python main.py")
