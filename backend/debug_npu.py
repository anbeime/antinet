"""
NPU诊断脚本 - 检查模型加载问题
"""
import time
from pathlib import Path
from models.model_loader import NPUModelLoader, GENIE_CONTEXT_AVAILABLE

print("=" * 70)
print("NPU 诊断测试")
print("=" * 70)

print(f"\n✓ GenieContext 可用: {GENIE_CONTEXT_AVAILABLE}")

print(f"\n✓ 模型配置:")
loader = NPUModelLoader()
print(f"  - 模型名称: {loader.model_config['name']}")
print(f"  - 模型路径: {loader.model_config['path']}")

print(f"\n✓ 路径检查:")
model_path = Path(loader.model_config['path'])
print(f"  - 路径存在: {model_path.exists()}")
if model_path.exists():
    print(f"  - config.json 存在: {(model_path / 'config.json').exists()}")
    model_files = list(model_path.glob('model-*.bin'))
    if model_files:
        total_size = sum(f.stat().st_size for f in model_files)
        print(f"  - 模型文件数量: {len(model_files)}")
        print(f"  - 模型总大小: {total_size / 1024**3:.2f} GB")
    else:
        print(f"  - 警告: 未找到 model-*.bin 文件")

print(f"\n✓ 尝试加载模型（最多等待30秒）:")
try:
    start = time.time()
    model = loader.load()
    load_time = time.time() - start
    print(f"\n✅ 加载成功！")
    print(f"  - 加载时间: {load_time:.2f}秒")
    print(f"  - 模型类型: {type(model).__name__}")
    print(f"  - 使用NPU: {GENIE_CONTEXT_AVAILABLE and 'Genie' in str(type(model))}")
    
    # 测试推理
    print(f"\n✓ 测试推理:")
    test_prompt = "分析端侧AI的优势"
    start = time.time()
    result = loader.infer(test_prompt, max_new_tokens=64)
    inference_time = (time.time() - start) * 1000
    print(f"  - 推理延迟: {inference_time:.2f}ms")
    print(f"  - 结果: {result[:100]}...")
    
except Exception as e:
    print(f"\n❌ 加载失败!")
    print(f"  - 错误类型: {type(e).__name__}")
    print(f"  - 错误信息: {str(e)[:200]}")
    import traceback
    print(f"\n  - 完整错误跟踪:")
    traceback.print_exc()

print("\n" + "=" * 70)
print("诊断完成")
print("=" * 70)
