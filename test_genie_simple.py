#!/usr/bin/env python3
"""
简单测试 GenieContext 导入和创建
"""
import os
import sys
import time

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
os.environ['QNN_LOG_LEVEL'] = "INFO"

print("[INFO] 测试开始...")

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
    
    print("\n[SUCCESS] 测试通过!")
    
except Exception as e:
    print(f"[ERROR] 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)