#!/usr/bin/env python3
"""
正确的 GenieContext 使用示例
基于官方示例
"""
import os
import sys
from pathlib import Path

# 设置环境变量
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if lib_path not in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

print(f"PATH 已更新: {os.getenv('PATH')[:200]}...")

# 导入 QAI AppBuilder
try:
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext 导入成功")
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

# 加载模型
print("\n加载模型...")
try:
    start_time = time.time()
    dialog = GenieContext(str(config_file))
    load_time = time.time() - start_time
    
    print(f"[OK] 模型加载成功")
    print(f"  加载时间: {load_time:.2f}s")
    print(f"  模型类型: {type(dialog)}")
    
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 定义回调函数
def response(text):
    print(text, end='', flush=True)
    return True

# 测试推理
print("\n\n执行推理测试...")
prompts = [
    "分析一下端侧AI的优势",
    "总结数据的主要趋势",
    "这个问题的解决方案是什么"
]

for i, prompt in enumerate(prompts, 1):
    print(f"\n测试 {i}/{len(prompts)}: {prompt}")
    
    try:
        start_time = time.time()
        
        # 执行推理
        dialog.Query(prompt, response)
        
        inference_time = (time.time() - start_time) * 1000
        print(f"\n  延迟: {inference_time:.2f}ms")
        
    except Exception as e:
        print(f"[ERROR] 推理失败: {e}")
        import traceback
        traceback.print_exc()

print("\n\n测试完成")