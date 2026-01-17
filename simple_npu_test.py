#!/usr/bin/env python3
"""
最简单的 NPU 测试 - 验证真实推理
"""
import sys
import os
import time
import logging

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

print("=" * 70)
print("NPU 真实推理测试 - 简单版")
print("=" * 70)

# 导入模块
try:
    from models.model_loader import NPUModelLoader
    print("[OK] 模块导入成功")
except Exception as e:
    print(f"[ERROR] 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 创建加载器
print("\n[步骤 1] 创建模型加载器...")
try:
    loader = NPUModelLoader()
    print("[OK] 加载器创建成功")
except Exception as e:
    print(f"[ERROR] 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 加载模型
print("\n[步骤 2] 加载模型...")
try:
    model = loader.load()
    print("[OK] 模型加载成功")
    
    # 打印设备信息
    stats = loader.get_performance_stats()
    print(f"  - 模型: {stats['model_name']}")
    print(f"  - 设备: {stats['device']}")
except Exception as e:
    print(f"[ERROR] 加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 执行推理
print("\n[步骤 3] 执行推理...")
test_prompt = "分析一下端侧AI的优势"
print(f"输入: {test_prompt}")

try:
    start_time = time.time()
    result = loader.infer(test_prompt, max_new_tokens=128)
    inference_time = (time.time() - start_time) * 1000
    
    print(f"[OK] 推理完成")
    print(f"  - 延迟: {inference_time:.2f}ms {'[OK]' if inference_time < 500 else '[WARNING]'}")
    print(f"  - 输出: {result[:100]}...")
    
except Exception as e:
    print(f"[ERROR] 推理失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 性能验证
print("\n[步骤 4] 性能验证...")
if inference_time < 500:
    print("[OK] 性能达标 (< 500ms)")
else:
    print(f"[WARNING] 性能超标 (>= 500ms)")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)