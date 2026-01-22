#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
诊断后端启动时的模型加载问题
"""

import os
import sys
import time
from pathlib import Path
import traceback

# 完全复制 main.py 的环境设置
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

paths_to_add = [lib_path, bridge_lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

# 添加 backend 路径
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 80)
print("测试后端 startup_event 逻辑")
print("=" * 80)

# 完全模拟 startup_event 的代码
try:
    print("\n[模拟 startup_event]")
    print("1. 导入 get_model_loader...")
    from models.model_loader import get_model_loader
    
    print("2. 调用 get_model_loader()...")
    loader = get_model_loader()
    
    print(f"3. 检查 loader.is_loaded: {loader.is_loaded}")
    
    if loader.is_loaded:
        print("   -> 模型已加载，跳过加载")
    else:
        print("4. 调用 loader.load()...")
        start_time = time.time()
        model = loader.load()
        load_time = time.time() - start_time
        
        print(f"   -> load() 调用完成，耗时: {load_time:.2f}s")
        print(f"   -> loader.is_loaded 现在是: {loader.is_loaded}")
        print(f"   -> loader.model 类型: {type(loader.model)}")
        
        if not loader.is_loaded:
            print("\n   ❌ 错误：load() 返回了但 is_loaded=False")
        else:
            print("\n   ✓ 成功：模型已加载")
            
            # 测试推理
            print("\n5. 测试推理...")
            result = loader.infer("测试", max_new_tokens=10)
            print(f"   推理结果: {result[:100] if result else '(空)'}")
            
except Exception as e:
    print(f"\n❌ 异常: {e}")
    print("\n完整堆栈:")
    traceback.print_exc()

print("\n" + "=" * 80)
