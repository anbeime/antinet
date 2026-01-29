#!/usr/bin/env python3
"""
NPU速度测试 - 验证修复后的性能
"""
import os
import sys
import time

# 必须先设置环境变量
os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'

sys.path.insert(0, 'backend')

print("=" * 70)
print("NPU Speed Test")
print("=" * 70)

# 导入NPU核心
from npu_core import NPUInferenceCore

# 创建NPU实例
print("\n[1] Creating NPU Core...")
npu = NPUInferenceCore()
print("   OK - NPU Core created")

# 加载模型
print("\n[2] Loading Model (this may take 10-30s)...")
start = time.time()
try:
    npu.load_model()
    load_time = (time.time() - start) * 1000
    print(f"   OK - Model loaded in {load_time:.1f}ms")
except Exception as e:
    print(f"   Error: {e}")
    sys.exit(1)

# 测试推理
print("\n[3] Running Inference Tests...")
test_prompts = [
    "Hello",
    "What is AI?",
    "Explain quantum computing in simple terms"
]

for i, prompt in enumerate(test_prompts, 1):
    print(f"\n   Test {i}: '{prompt[:30]}...' " if len(prompt) > 30 else f"\n   Test {i}: '{prompt}'")
    try:
        start = time.time()
        result, latency = npu.infer(prompt)
        print(f"   Result: {result[:50]}..." if len(result) > 50 else f"   Result: {result}")
        print(f"   Latency: {latency:.1f}ms")
        
        if latency > 500:
            print(f"   WARNING: Slow! Expected < 500ms")
        else:
            print(f"   OK: Fast! < 500ms")
    except Exception as e:
        print(f"   Error: {e}")

print("\n" + "=" * 70)
print("Test Complete")
print("=" * 70)
