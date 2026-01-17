#!/usr/bin/env python3
"""
NPU 性能测试 - 使用修复后的 model_loader
"""
import sys
import os

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import logging
from models.model_loader import load_model_if_needed

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

print("=" * 70)
print("NPU 性能测试")
print("=" * 70)

# 加载模型
print("\n[步骤 1] 加载模型...")
model = load_model_if_needed()
print("[OK] 模型加载成功")

# 测试推理
print("\n[步骤 2] 测试推理...")
test_prompts = [
    "分析一下端侧AI的优势",
    "总结数据的主要趋势",
    "这个问题的解决方案是什么"
]

for i, prompt in enumerate(test_prompts, 1):
    print(f"\n测试 {i}/{len(test_prompts)}: {prompt}")
    
    import time
    start_time = time.time()
    
    # 注意：这里应该使用 loader.infer()，而不是 model.generate_text()
    # 因为 model 是 GenieContext 实例
    from models.model_loader import get_model_loader
    loader = get_model_loader()
    result = loader.infer(prompt, max_new_tokens=100)
    
    inference_time = (time.time() - start_time) * 1000
    
    print(f"  - 延迟: {inference_time:.2f}ms {'[OK]' if inference_time < 500 else '[WARNING]'}")
    print(f"  - 输出: {result[:80]}...")

print("\n测试完成")