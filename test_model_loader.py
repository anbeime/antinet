import sys
import os
import logging

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

sys.path.insert(0, 'backend')

try:
    from models.model_loader import NPUModelLoader
    print("导入 NPUModelLoader 成功")
except ImportError as e:
    print(f"导入失败: {e}")
    sys.exit(1)

print("创建加载器实例...")
loader = NPUModelLoader(model_key="qwen2-7b-ssd")

print("加载模型...")
try:
    model = loader.load()
    print(f"模型加载结果: {model}")
    print(f"是否已加载: {loader.is_loaded}")
    print(f"是否NPU模式: {loader.npu_mode}")
except Exception as e:
    print(f"加载失败: {e}")
    import traceback
    traceback.print_exc()

print("\n执行推理测试...")
try:
    result = loader.infer("你好，请介绍一下高通骁龙 X Elite AIPC。", max_new_tokens=64)
    print(f"推理结果: {result[:200]}...")
except Exception as e:
    print(f"推理失败: {e}")
    import traceback
    traceback.print_exc()