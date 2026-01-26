"""
测试 NPU 模型加载
"""
import sys
import os

# 添加backend路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("=" * 60)
print("NPU 模型加载测试")
print("=" * 60)

try:
    print("\n[1/4] 导入模型加载器...")
    from models.model_loader import get_model_loader
    print("    [OK] 模型加载器导入成功")
    
    print("\n[2/4] 获取模型加载器实例...")
    loader = get_model_loader()
    print(f"    [OK] 加载器实例: {loader.model_config['name']}")
    print(f"    [OK] 模型路径: {loader.model_config['path']}")
    
    print("\n[3/4] 加载NPU模型...")
    print("    (这可能需要 10-15 秒...)")
    model = loader.load()
    print("    [OK] NPU模型加载成功")
    
    print("\n[4/4] 执行简单推理测试...")
    result = loader.infer("你好，请介绍一下你自己", max_new_tokens=50)
    print(f"    [OK] 推理成功")
    print(f"    输出: {result[:100]}...")
    
    print("\n" + "=" * 60)
    print("NPU 测试完全通过！")
    print("=" * 60)
    print("\n性能统计:")
    stats = loader.get_performance_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print("\n" + "=" * 60)
    print("环境配置成功！可以启动后端服务了。")
    print("=" * 60)
    
except Exception as e:
    print(f"\n[ERROR] 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
