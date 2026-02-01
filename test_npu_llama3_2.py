"""
使用轻量级模型测试 NPU 性能
"""
import sys
from pathlib import Path

# 添加 backend 目录到路径
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("="*70)
print("NPU 轻量级模型性能测试 (llama3.2-3b)")
print("="*70)

# 1. 导入模型加载器
print("\n[1/4] 导入模型加载器...")
try:
    from models.model_loader import NPUModelLoader
    print("  [OK] 模型加载器导入成功")
except Exception as e:
    print(f"  [ERROR] 导入失败: {e}")
    sys.exit(1)

# 2. 创建轻量级模型加载器
print("\n[2/4] 创建轻量级模型加载器 (llama3.2-3b)...")
try:
    loader = NPUModelLoader(model_key="llama3.2-3b")
    print(f"  [OK] 模型加载器创建成功")
    print(f"  [INFO] 模型: {loader.model_config['name']}")
    print(f"  [INFO] 参数量: {loader.model_config['params']}")
except Exception as e:
    print(f"  [ERROR] 创建失败: {e}")
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
except Exception as e:
    print(f"  [ERROR] 加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 4. 执行推理测试
print("\n[4/4] 执行推理测试...")
test_cases = [
    {"prompt": "你好", "max_tokens": 16},
    {"prompt": "什么是AI？", "max_tokens": 32},
]

results = []
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
        print(f"    [INFO] 生成内容: {result[:80]}...")

        # 性能评估
        if infer_time < 500:
            print(f"    [优秀] 延迟 < 500ms (达标)")
        elif infer_time < 1000:
            print(f"    [良好] 延迟 < 1000ms (可接受)")
        else:
            print(f"    [警告] 延迟 > 1000ms (需要优化)")

        results.append({
            "prompt": test['prompt'],
            "max_tokens": test['max_tokens'],
            "inference_time": infer_time,
            "passed": infer_time < 500
        })

    except Exception as e:
        print(f"    [ERROR] 推理失败: {e}")
        import traceback
        traceback.print_exc()

# 性能统计
print("\n" + "="*70)
print("性能统计")
print("="*70)
if results:
    avg_time = sum(r['inference_time'] for r in results) / len(results)
    passed_count = sum(1 for r in results if r['passed'])

    print(f"平均延迟: {avg_time:.2f}ms")
    print(f"通过率: {passed_count}/{len(results)} ({passed_count/len(results)*100:.1f}%)")
    print(f"最慢延迟: {max(r['inference_time'] for r in results):.2f}ms")
    print(f"最快延迟: {min(r['inference_time'] for r in results):.2f}ms")

print("\n" + "="*70)
print("结论")
print("="*70)
if avg_time < 500:
    print("[成功] NPU 性能达标，推理延迟 < 500ms")
elif avg_time < 1000:
    print("[良好] NPU 性能可接受，推理延迟 < 1000ms")
else:
    print("[警告] NPU 性能未达标，推理延迟 > 1000ms")
    print("建议:")
    print("  - 使用更小的 max_new_tokens (16-32)")
    print("  - 检查 BURST 性能模式是否启用")
    print("  - 确认模型正确运行在 NPU 上")
    print("  - 考虑使用 llama3.2-3b 作为默认模型")

print("="*70)
