#!/usr/bin/env python3
"""
快速NPU测试
"""
import sys
import os
import time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("="*60)
print("快速NPU测试")
print("="*60)

try:
    from npu_core import NPUInferenceCore
    print("✓ NPUInferenceCore导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

try:
    print("\n创建NPU核心实例...")
    npu = NPUInferenceCore()
    print("✓ NPU核心实例创建成功")
    
    print("\n尝试加载模型...")
    start = time.time()
    npu.load_model()
    load_time = time.time() - start
    print(f"✓ 模型加载成功 ({load_time:.2f}秒)")
    
    print("\n执行简单推理...")
    result, latency = npu.infer("你好")
    print(f"✓ 推理成功")
    print(f"  结果: {result[:100]}...")
    print(f"  延迟: {latency:.2f}ms")
    
    print("\n" + "="*60)
    print("NPU测试通过!")
    print("="*60)
    
except Exception as e:
    print(f"\n✗ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)