#!/usr/bin/env python3
"""
直接测试 GenieContext，不经过 model_loader
"""
import os
import sys
import time
from pathlib import Path

# 设置环境变量
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if lib_path not in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

print(f"PATH 设置完成")

# 导入 QAI AppBuilder
try:
    from qai_appbuilder import GenieContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
    print("[OK] QAI AppBuilder 导入成功")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

# 验证模型文件
model_dir = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
config_file = model_dir / "config.json"

print(f"\n检查模型配置:")
print(f"  模型目录: {model_dir}")
print(f"  配置文件: {config_file}")

if not model_dir.exists():
    print(f"[ERROR] 模型目录不存在: {model_dir}")
    sys.exit(1)

if not config_file.exists():
    print(f"[ERROR] 配置文件不存在: {config_file}")
    sys.exit(1)

print("[OK] 模型文件存在")

# 配置 QNN 环境
print("\n配置 QNN 环境...")
try:
    QNNConfig.Config(
        str(lib_path),
        Runtime.HTP,
        LogLevel.INFO,
        ProfilingLevel.BASIC,
        "None"
    )
    print("[OK] QNN HTP 配置成功")
except Exception as e:
    print(f"[WARNING] QNN 配置失败: {e}")
    # 尝试 CPU 模式
    try:
        QNNConfig.Config(
            str(lib_path),
            Runtime.CPU,
            LogLevel.INFO,
            ProfilingLevel.BASIC,
            "None"
        )
        print("[OK] QNN CPU 配置成功（回退模式）")
    except Exception as cpu_error:
        print(f"[ERROR] CPU 模式也失败: {cpu_error}")
        sys.exit(1)

# 加载模型
print("\n加载模型...")
try:
    start_time = time.time()
    dialog = GenieContext(str(config_file))
    load_time = time.time() - start_time
    
    print(f"[OK] 模型加载成功")
    print(f"  加载时间: {load_time:.2f}s")
    print(f"  模型类型: {type(dialog)}")
    
    # 定义回调函数
    def response(text):
        print(text, end='', flush=True)
        return True
    
    # 测试推理
    print("\n\n推理测试...")
    prompts = [
        "分析一下端侧AI的优势",
        "总结数据的主要趋势",
        "这个问题的解决方案是什么"
    ]
    
    latencies = []
    
    for i, prompt in enumerate(prompts, 1):
        print(f"\n测试 {i}/{len(prompts)}: {prompt}")
        
        start_time = time.time()
        dialog.Query(prompt, response)
        inference_time = (time.time() - start_time) * 1000
        latencies.append(inference_time)
        
        print(f"\n  延迟: {inference_time:.2f}ms {'[OK]' if inference_time < 500 else '[WARNING] 超标'}")
    
    # 性能统计
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        
        print(f"\n\n性能统计:")
        print(f"  平均延迟: {avg_latency:.2f}ms")
        print(f"  最小延迟: {min_latency:.2f}ms")
        print(f"  最大延迟: {max_latency:.2f}ms")
        
        if avg_latency < 500:
            print(f"  [OK] 性能达标 (< 500ms)")
        else:
            print(f"  [WARNING] 性能超标 (>= 500ms)")
    
except Exception as e:
    print(f"[ERROR] 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试完成")