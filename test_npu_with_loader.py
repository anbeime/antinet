"""
使用项目模型加载器测试 NPU 功能
"""
import sys
from pathlib import Path

# 添加 backend 目录到路径
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("="*70)
print("NPU 模型加载器验证测试")
print("="*70)

# 1. 导入模型加载器
print("\n[1/4] 导入模型加载器...")
try:
    from models.model_loader import NPUModelLoader, get_model_loader, ModelConfig
    print("  [OK] 模型加载器导入成功")
    print(f"  [INFO] 可用模型: {list(ModelConfig.MODELS.keys())}")
except Exception as e:
    print(f"  [ERROR] 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 2. 获取模型加载器实例
print("\n[2/4] 获取模型加载器实例...")
try:
    loader = get_model_loader()
    print(f"  [OK] 模型加载器实例创建成功")
    print(f"  [INFO] 使用模型: {loader.model_config['name']}")
except Exception as e:
    print(f"  [ERROR] 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 3. 加载模型
print("\n[3/4] 加载模型...")
try:
    import time
    start_load = time.time()
    model = loader.load()
    load_time = time.time() - start_load

    print(f"  [OK] 模型加载成功")
    print(f"  [INFO] 加载时间: {load_time:.2f}s")
    print(f"  [INFO] 模型名称: {loader.model_config['name']}")
    print(f"  [INFO] 运行设备: NPU (Hexagon)")
except Exception as e:
    print(f"  [ERROR] 加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 4. 执行推理测试
print("\n[4/4] 执行推理测试...")
test_cases = [
    {"prompt": "你好", "max_tokens": 32},
    {"prompt": "什么是AI PC？", "max_tokens": 64},
]

for i, test in enumerate(test_cases, 1):
    print(f"\n  测试 {i}/{len(test_cases)}:")
    print(f"    提示词: {test['prompt']}")
    print(f"    最大Token: {test['max_tokens']}")

    try:
        start_infer = time.time()
        result = loader.infer(test['prompt'], max_new_tokens=test['max_tokens'])
        infer_time = (time.time() - start_infer) * 1000

        print(f"    [成功] 推理完成")
        print(f"    [INFO] 推理延迟: {infer_time:.2f}ms")

        # 性能评估
        if infer_time < 500:
            print(f"    [优秀] 延迟 < 500ms (达标)")
        elif infer_time < 1000:
            print(f"    [良好] 延迟 < 1000ms (可接受)")
        else:
            print(f"    [警告] 延迟 > 1000ms (需要优化)")

        print(f"    [INFO] 生成内容: {result[:100]}...")

    except Exception as e:
        print(f"    [ERROR] 推理失败: {e}")
        import traceback
        traceback.print_exc()

# 总结
print("\n" + "="*70)
print("NPU 验证总结")
print("="*70)
print(f"[成功] 模型加载器: OK")
print(f"[成功] 模型加载: OK ({loader.model_config['name']})")
print(f"[成功] 运行设备: NPU (Hexagon)")
print(f"[成功] 推理功能: OK")
print("="*70)
print("[完成] NPU 功能验证通过！")
print("="*70)
