import requests
import time

print("测试NPU API...")

try:
    # 等待后端启动
    time.sleep(2)
    
    # 测试健康检查
    r = requests.get('http://localhost:8000/api/health', timeout=5)
    print(f"健康检查: {r.status_code}")
    print(f"  响应: {r.json()}")
    
    # 测试NPU推理
    print("\n开始NPU推理测试...")
    start = time.time()
    r = requests.post('http://localhost:8000/api/analyze', 
                    json={'query': '你好'}, 
                    timeout=60)
    elapsed = time.time() - start
    
    print(f"推理请求: {r.status_code}")
    print(f"  耗时: {elapsed:.2f}秒")
    
    if r.status_code == 200:
        result = r.json()
        print(f"  ✓ 成功!")
        print(f"  查询: {result.get('query')}")
        print(f"  事实数: {len(result.get('facts', []))}")
        print(f"  性能: {result.get('performance')}")
    else:
        print(f"  ✗ 失败: {r.text}")
        
except Exception as e:
    print(f"错误: {e}")
