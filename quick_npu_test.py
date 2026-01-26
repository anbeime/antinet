#!/usr/bin/env python3
import sys
sys.path.insert(0, 'backend')

import time
from models.model_loader import get_model_loader

print("=" * 60)
print("NPU 真推理快速测试")
print("=" * 60)

# 1. 检查配置
print("\n[1/3] 检查配置文件...")
import os
backend_config = open('backend/config.py', encoding='utf-8').read()
if 'USE_MOCK' in backend_config or 'use_mock' in backend_config.lower():
    print("[ERROR] 发现模拟开关在配置文件中")
    sys.exit(1)
print(" 配置文件检查通过（无模拟开关）")

# 2. 加载模型
print("\n[2/3] 加载 NPU 模型...")
loader = get_model_loader('llama3.2-3b')  # 使用实际存在的模型
model = loader.load()
print(f"[OK] 模型加载成功: {loader.model_config['name']}")

# 3. 执行推理
print("\n[3/3] 执行推理测试...")
test_prompt = "请简单介绍端侧AI的优势，不超过100字。"

start_time = time.time()
result = loader.infer(prompt=test_prompt, max_new_tokens=100)
inference_time = (time.time() - start_time) * 1000

print(f"\n推理结果:")
print(f"  - 推理时间: {inference_time:.2f}ms")
print(f"  - 输出内容: {result[:100]}...")

# 熔断检查
if inference_time > 500:
    print(f"\n 熔断检查失败：推理时间 {inference_time:.2f}ms > 500ms")
    print(f" 可能未走 NPU，请检查 QNN profile")
    sys.exit(1)

print(f"\n 熔断检查通过：推理时间 {inference_time:.2f}ms < 500ms")
print(f"\n{'='*60}")
print(f" 所有验证通过！NPU 推理正常")
print(f"{'='*60}")
