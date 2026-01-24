#!/usr/bin/env python3
"""
测试ChatBotModal修复是否成功
"""
import sys
import requests
import json

def test_chat_api():
    """测试聊天API是否正常工作"""
    print("=" * 60)
    print("测试ChatBotModal修复")
    print("=" * 60)
    
    # 测试1: 健康检查
    print("\n[测试1] 后端健康检查...")
    try:
        response = requests.get("http://localhost:8000/api/health", timeout=5)
        if response.status_code == 200:
            print(f"✓ 健康检查通过: {response.json()}")
        else:
            print(f"✗ 健康检查失败: HTTP {response.status_code}")
    except Exception as e:
        print(f"✗ 无法连接后端: {e}")
        print("  请确保后端正在运行: cd backend && python main.py")
    
    # 测试2: 知识库查询
    print("\n[测试2] 知识库查询功能...")
    try:
        test_query = "骁龙NPU性能优势"
        response = requests.post(
            "http://localhost:8000/api/chat/query",
            json={"query": test_query},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 查询成功")
            print(f"  回复: {data.get('response', '')[:100]}...")
            print(f"  卡片数量: {len(data.get('cards', []))}")
            print(f"  来源: {data.get('sources', [])}")
        else:
            print(f"✗ 查询失败: HTTP {response.status_code}")
            print(f"  错误: {response.text}")
    except Exception as e:
        print(f"✗ 查询异常: {e}")
    
    # 测试3: NPU状态
    print("\n[测试3] NPU模型状态...")
    try:
        response = requests.get("http://localhost:8000/api/npu/status", timeout=5)
        if response.status_code == 200:
            print(f"✓ NPU状态正常: {response.json()}")
        else:
            print(f"✗ NPU状态查询失败: HTTP {response.status_code}")
    except Exception as e:
        print(f"✗ NPU状态查询异常: {e}")
    
    # 测试4: 智能路由
    print("\n[测试4] 智能路由器测试...")
    try:
        response = requests.post(
            "http://localhost:8000/api/npu/test-router?query=测试",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 路由测试成功")
            print(f"  查询: {data.get('query')}")
            print(f"  复杂度: {data.get('complexity')}")
            print(f"  选择模型: {data.get('selected_model')}")
        else:
            print(f"✗ 路由测试失败: HTTP {response.status_code}")
    except Exception as e:
        print(f"✗ 路由测试异常: {e}")
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
    print("\n下一步操作:")
    print("1. 打开浏览器: http://localhost:5173")
    print("2. 点击右下角聊天机器人图标")
    print("3. 尝试输入文字，检查是否可以正常输入")
    print("4. 输入测试问题，如: 'AIPC端侧部署优势'")
    print("5. 按F12打开控制台，查看是否有错误日志")

if __name__ == "__main__":
    test_chat_api()
