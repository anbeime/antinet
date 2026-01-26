#!/usr/bin/env python3
"""
测试真实 NPU 推理（GenieContext）
"""
import os
import sys
import time
import traceback

# 设置库路径
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 添加DLL目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

# 添加Genie路径
genie_path = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if genie_path not in sys.path:
    sys.path.append(genie_path)

# 设置 QNN 日志级别
os.environ['QNN_LOG_LEVEL'] = "DEBUG"

print("[INFO] 开始测试 GenieContext NPU 推理...")

try:
    # 导入 GenieContext
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext 导入成功")
    
    # 检查模型文件
    config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"模型配置文件不存在: {config_path}")
    print(f"[OK] 模型配置文件存在: {config_path}")
    
    # 创建 GenieContext
    print("[INFO] 正在创建 GenieContext...")
    start_time = time.time()
    genie = GenieContext(config_path)
    load_time = time.time() - start_time
    print(f"[OK] GenieContext 创建成功 (耗时: {load_time:.2f}s)")
    
    # 执行推理
    test_prompt = "分析一下当前的数据趋势"
    print(f"[INFO] 执行 NPU 推理: '{test_prompt}'")
    
    start_time = time.time()
    response = genie.infer(
        prompt=test_prompt,
        max_new_tokens=128,
        temperature=0.7
    )
    inference_time = time.time() - start_time
    
    print(f"[OK] NPU 推理成功!")
    print(f"  - 推理延迟: {inference_time:.2f}s ({inference_time*1000:.2f}ms)")
    print(f"  - 响应长度: {len(response)} 字符")
    print(f"  - 响应内容: {response[:200]}...")
    
    # 验证推理延迟是否符合目标
    if inference_time * 1000 < 500:
        print("  - 达标: ✓ (推理延迟 < 500ms)")
    else:
        print(f"  - 不达标: ✗ (推理延迟 {inference_time*1000:.2f}ms > 500ms)")
    
    print("\n[SUCCESS] GenieContext NPU 推理测试通过!")
    
except Exception as e:
    print(f"[ERROR] 测试失败: {e}")
    print("详细错误:")
    traceback.print_exc()
    sys.exit(1)