#!/usr/bin/env python3
"""
基于官方 GenieSample.py 的测试
"""
import os
import sys
import time
from pathlib import Path

# 设置环境变量 - 与官方示例相同
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    lib_path = os.getenv('PATH') + ";" + lib_path + ";"
    os.environ['PATH'] = lib_path

print(f"PATH 设置完成")

# 导入 QAI AppBuilder
from qai_appbuilder import GenieContext

def response(text):
    # Print model generated text.
    print(text, end='', flush=True)
    return True

# 使用我们的模型路径
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"配置路径: {config_path}")

if not os.path.exists(config_path):
    print(f"[ERROR] 配置文件不存在: {config_path}")
    sys.exit(1)

# Initialize the model.
print("\n初始化模型...")
try:
    start_time = time.time()
    dialog = GenieContext(config_path)
    load_time = time.time() - start_time
    print(f"[OK] 模型加载成功，耗时: {load_time:.2f}s")
    
    # Ask question.
    prompt = "分析一下端侧AI的优势"
    print(f"\n提问: {prompt}")
    print("回答: ", end='')
    
    start_time = time.time()
    dialog.Query(prompt, response)
    inference_time = (time.time() - start_time) * 1000
    
    print(f"\n\n推理延迟: {inference_time:.2f}ms")
    
    if inference_time < 500:
        print(f"[OK] 性能达标 (< 500ms)")
    else:
        print(f"[WARNING] 性能超标: {inference_time:.2f}ms")
        
except Exception as e:
    print(f"[ERROR] 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试完成")