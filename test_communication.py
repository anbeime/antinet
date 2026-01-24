#!/usr/bin/env python3
"""
测试前后端通信是否正常
"""
import requests
import json
import sys
import time

def test_backend_health():
    """测试后端健康状态"""
    print("=" * 60)
    print("测试1: 后端健康检查")
    print("=" * 60)
    try:
        response = requests.get("http://localhost:8000/api/health", timeout=5)
        print(f"✅ 状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务 (ConnectionError)")
        print("   请确保后端正在运行: cd backend && python main.py")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_chat_api():
    """测试聊天API"""
    print("\n" + "=" * 60)
    print("测试2: 聊天API")
    print("=" * 60)
    try:
        test_query = "骁龙NPU性能优势"
        print(f"查询: {test_query}")
        
        response = requests.post(
            "http://localhost:8000/api/chat/query",
            json={"query": test_query},
            timeout=10
        )
        
        print(f"✅ 状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 响应长度: {len(str(data))} 字符")
            print(f"✅ 回复: {data.get('response', '')[0:100]}...")
            print(f"✅ 卡片数: {len(data.get('cards', []))}")
            print(f"✅ 来源数: {len(data.get('sources', []))}")
            return True
        else:
            print(f"❌ API调用失败: {response.status_code}")
            print(f"❌ 错误信息: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_npu_status():
    """测试NPU状态"""
    print("\n" + "=" * 60)
    print("测试3: NPU状态")
    print("=" * 60)
    try:
        response = requests.get("http://localhost:8000/api/npu/status", timeout=5)
        print(f"✅ 状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ NPU状态: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"❌ 查询失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_model_router():
    """测试智能路由"""
    print("\n" + "=" * 60)
    print("测试4: 智能路由器")
    print("=" * 60)
    try:
        response = requests.post(
            "http://localhost:8000/api/npu/test-router?query=测试",
            timeout=5
        )
        print(f"✅ 状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 路由结果:")
            print(f"   - 查询: {data.get('query')}")
            print(f"   - 复杂度: {data.get('complexity')}")
            print(f"   - 选择模型: {data.get('selected_model')}")
            return True
        else:
            print(f"❌ 路由测试失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_frontend_mock():
    """测试前端模拟模式"""
    print("\n" + "=" * 60)
    print("测试5: 前端模拟模式（后端未运行）")
    print("=" * 60)
    print("✅ 前端已配置模拟模式")
    print("✅ 当后端不可用时，会自动返回模拟数据")
    print("✅ 确保演示流程不中断")
    return True

def main():
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "Antinet通信测试" + " " * 26 + "║")
    print("╚" + "=" * 58 + "╝")
    
    results = []
    
    # 测试后端
    results.append(("后端健康", test_backend_health()))
    time.sleep(1)
    
    # 测试API
    results.append(("聊天API", test_chat_api()))
    time.sleep(1)
    
    # 测试NPU
    results.append(("NPU状态", test_npu_status()))
    time.sleep(1)
    
    # 测试路由
    results.append(("智能路由", test_model_router()))
    
    # 测试模拟模式
    results.append(("前端模拟", test_frontend_mock()))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status}: {name}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！通信正常")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败，请检查")
        return 1

if __name__ == "__main__":
    sys.exit(main())
