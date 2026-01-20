#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test NPU Model Loading
"""

import sys
import os
from pathlib import Path

# 设置环境变量 - 使用绝对路径
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
# 添加桥接库目录
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

# 确保两个目录都在 PATH 中
paths_to_add = [lib_path, bridge_lib_path]
current_path = os.getenv('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 显式添加 DLL 目录（Python 3.8+）
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

print("=" * 80)
print("NPU Model Loading Test")
print("=" * 80)
print(f"PATH contains qai_libs: {'qai_libs' in current_path}")
print(f"PATH contains bridge dir: {bridge_lib_path in current_path}")
print()

# Step 1: Import GenieContext
print("Step 1: Import GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("  SUCCESS: GenieContext imported")
except Exception as e:
    print(f"  ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()

# Step 2: Create GenieContext
print("Step 2: Create GenieContext...")
model_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34"
config_path = f"{model_path}/config.json"

print(f"  Model path: {model_path}")
print(f"  Config path: {config_path}")

try:
    model = GenieContext(config_path)
    print("  SUCCESS: GenieContext created")
except Exception as e:
    print(f"  ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()
print("=" * 80)
print("Test PASSED: NPU model loaded successfully!")
print("=" * 80)
