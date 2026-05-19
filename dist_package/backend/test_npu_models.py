#!/usr/bin/env python3
"""
直接测试 NPU 模型加载和推理
"""
import sys
import os

# 添加 backend 路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_root)

print("=" * 60)
print("NPU 模型测试脚本")
print("=" * 60)

# 测试 1: 列出所有模型
print("\n[测试1] 列出所有可用模型")
print("-" * 40)
from models.model_loader import ModelConfig
for key, config in ModelConfig.MODELS.items():
    print(f"\n模型: {key}")
    print(f"  名称: {config.get('name', 'N/A')}")
    print(f"  类型: {config.get('type', 'N/A')}")
    print(f"  路径: {config.get('path', 'N/A')}")
    print(f"  描述: {config.get('description', 'N/A')}")

# 测试 2: 测试 llama3.2-3b NPU 模型
print("\n\n[测试2] 加载并测试 llama3.2-3b NPU 模型")
print("-" * 40)
try:
    from models.model_loader import NPUModelLoader
    
    loader = NPUModelLoader("llama3.2-3b")
    print(f"加载模型: {loader.model_config['name']}")
    
    # 加载模型
    model = loader.load()
    print("模型加载成功!")
    
    # 执行推理
    test_prompt = "用一句话介绍你自己"
    print(f"\n输入: {test_prompt}")
    
    result = loader.infer(test_prompt, max_new_tokens=128)
    print(f"\n输出: {result}")
    
    # 获取性能统计
    stats = loader.get_performance_stats()
    print(f"\n性能统计: {stats}")
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

# 测试 3: 测试 gemma4 API 模型
print("\n\n[测试3] 测试 gemma4 API 模型")
print("-" * 40)
try:
    from models.model_loader import APIModelLoader
    
    loader = APIModelLoader("gemma4")
    print(f"加载 API 模型: {loader.model_config['name']}")
    print(f"API 端点: {loader.api_endpoint}")
    
    # 执行推理
    test_prompt = "用一句话介绍你自己"
    print(f"\n输入: {test_prompt}")
    
    result = loader.infer(test_prompt, max_new_tokens=128)
    print(f"\n输出: {result}")
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

# 测试 4: 测试 qwen2.0-7b
print("\n\n[测试4] 测试 qwen2.0-7b NPU 模型")
print("-" * 40)
try:
    from models.model_loader import NPUModelLoader
    
    loader = NPUModelLoader("qwen2.0-7b")
    print(f"加载模型: {loader.model_config['name']}")
    
    # 加载模型
    model = loader.load()
    print("模型加载成功!")
    
    # 执行推理
    test_prompt = "用一句话介绍你自己"
    print(f"\n输入: {test_prompt}")
    
    result = loader.infer(test_prompt, max_new_tokens=128)
    print(f"\n输出: {result}")
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)