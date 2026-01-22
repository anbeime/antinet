#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
直接测试模型加载，不依赖FastAPI
"""

import os
import sys

# 设置环境变量 - 必须在导入之前
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

paths_to_add = [lib_path, bridge_lib_path]
current_path = os.getenv('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 注册 DLL 搜索路径
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

print("=" * 80)
print("直接测试模型加载")
print("=" * 80)

# 添加 backend 路径
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("\n[1/3] 导入模型加载器...")
    from models.model_loader import NPUModelLoader, get_model_loader
    print("  ✅ 成功")

    print("\n[2/3] 加载模型...")
    loader = get_model_loader()
    model = loader.load()

    if not loader.is_loaded:
        print("  ❌ 模型未加载 (is_loaded=False)")
        sys.exit(1)

    print(f"  ✅ 模型加载成功")
    print(f"     - 模型: {loader.model_config['name']}")
    print(f"     - 参数: {loader.model_config['params']}")
    print(f"     - 量化: {loader.model_config['quantization']}")

    print("\n[3/3] 测试推理...")
    result = loader.infer("你好", max_new_tokens=10)
    if result:
        print(f"  ✅ 推理成功")
        print(f"     - 输出: {result[:100]}...")
    else:
        print(f"  ⚠️  推理成功但输出为空")

    print()
    print("=" * 80)
    print("所有测试通过！")
    print("=" * 80)

except Exception as e:
    print(f"\n❌ 错误: {e}")
    print(f"错误类型: {type(e).__name__}")
    import traceback
    print("\n完整堆栈:")
    traceback.print_exc()
    sys.exit(1)
