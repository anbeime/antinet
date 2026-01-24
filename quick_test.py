#!/usr/bin/env python3
"""快速测试新的API端点"""
import requests
import time
import sys

def test_api():
    print("等待后端服务启动...")
    time.sleep(5)
    
    try:
        # 测试健康检查
        print("\n1. 测试健康检查:")
        r = requests.get('http://localhost:8000/api/health', timeout=10)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   状态: {data.get('status')}")
        
        # 测试检查清单
        print("\n2. 测试检查清单API:")
        r = requests.get('http://localhost:8000/api/data/checklist', timeout=10)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            sections = data.get('data', [])
            print(f"   找到 {len(sections)} 个检查清单部分")
            for section in sections:
                print(f"   - {section['title']}: {len(section.get('items', []))} 个检查项")
        else:
            print(f"   错误: {r.text}")
        
        # 测试GTD任务
        print("\n3. 测试GTD任务API:")
        r = requests.get('http://localhost:8000/api/data/gtd-tasks', timeout=10)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            tasks = r.json()
            print(f"   找到 {len(tasks)} 个任务")
            
            categories = {}
            for task in tasks:
                cat = task.get('category', 'unknown')
                categories[cat] = categories.get(cat, 0) + 1
            
            for cat, count in categories.items():
                print(f"   - {cat}: {count} 个任务")
        else:
            print(f"   错误: {r.text}")
        
        print("\n[OK] 测试完成！")
        return True
        
    except Exception as e:
        print(f"\n[X] 测试失败: {e}")
        return False

if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)
