"""
前端页面自动化测试脚本
测试所有页面是否能正常加载
"""
import requests
import time

BASE_URL = "http://localhost:3000"

def test_page(url, page_name):
    """测试单个页面"""
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            # 检查是否包含 React 应用的标志
            if "root" in response.text or "Antinet" in response.text:
                print(f"✓ {page_name:20s} - 加载成功 ({response.status_code})")
                return True
            else:
                print(f"⚠ {page_name:20s} - 加载但内容异常 ({response.status_code})")
                return False
        else:
            print(f"✗ {page_name:20s} - 加载失败 ({response.status_code})")
            return False
    except requests.exceptions.Timeout:
        print(f"✗ {page_name:20s} - 超时")
        return False
    except requests.exceptions.ConnectionError:
        print(f"✗ {page_name:20s} - 连接失败")
        return False
    except Exception as e:
        print(f"✗ {page_name:20s} - 错误: {str(e)}")
        return False

def test_api_endpoint(url, endpoint_name):
    """测试 API 端点"""
    try:
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            print(f"✓ {endpoint_name:20s} - API 可用 ({response.status_code})")
            return True
        else:
            print(f"✗ {endpoint_name:20s} - API 失败 ({response.status_code})")
            return False
    except Exception as e:
        print(f"✗ {endpoint_name:20s} - 错误: {str(e)[:30]}")
        return False

def main():
    print("=" * 70)
    print("Antinet 前端页面测试")
    print("=" * 70)
    print()
    
    # 测试前端页面
    print("[1/2] 测试前端页面加载...")
    print("-" * 70)
    
    pages = [
        (f"{BASE_URL}/", "首页"),
        # 注意：由于是 SPA，所有路由都返回同一个 HTML
        # 实际路由由前端 React Router 处理
    ]
    
    page_results = []
    for url, name in pages:
        result = test_page(url, name)
        page_results.append(result)
        time.sleep(0.5)
    
    print()
    
    # 测试后端 API
    print("[2/2] 测试后端 API...")
    print("-" * 70)
    
    api_endpoints = [
        ("http://localhost:8000/", "后端根路径"),
        ("http://localhost:8000/api/health", "健康检查"),
        ("http://localhost:8000/api/pdf/status", "PDF 状态"),
    ]
    
    api_results = []
    for url, name in api_endpoints:
        result = test_api_endpoint(url, name)
        api_results.append(result)
        time.sleep(0.5)
    
    print()
    print("=" * 70)
    print("测试总结")
    print("=" * 70)
    print(f"前端页面: {sum(page_results)}/{len(page_results)} 通过")
    print(f"后端 API: {sum(api_results)}/{len(api_results)} 通过")
    print()
    
    if all(page_results) and all(api_results):
        print("✓ 所有测试通过！")
        print()
        print("下一步：")
        print("1. 打开浏览器访问: http://localhost:3000")
        print("2. 手动测试各个功能页面")
        print("3. 参考测试清单: FRONTEND_USER_TESTING_CHECKLIST.md")
    else:
        print("✗ 部分测试失败，请检查服务状态")
        
        if not all(page_results):
            print("\n前端问题：")
            print("  - 确认前端服务器是否运行: pnpm dev")
            print("  - 检查端口 3000 是否被占用")
        
        if not all(api_results):
            print("\n后端问题：")
            print("  - 确认后端服务器是否运行: python backend/main.py")
            print("  - 检查端口 8000 是否被占用")

if __name__ == "__main__":
    main()
