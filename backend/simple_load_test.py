#!/usr/bin/env python3
"""
简单模型加载测试
"""

import os
import sys

# 设置环境变量
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

sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("简单模型加载测试")
print("=" * 60)

try:
    from models.model_loader import NPUModelLoader
    
    print("创建 NPUModelLoader 实例...")
    loader = NPUModelLoader()
    print(f"  模型配置: {loader.model_config['name']}")
    print(f"  路径: {loader.model_config['path']}")
    print(f"  is_loaded: {loader.is_loaded}")
    print(f"  model: {loader.model}")
    
    print("\n调用 loader.load()...")
    model = loader.load()
    print(f"  返回的 model: {model is not None}")
    print(f"  加载后 is_loaded: {loader.is_loaded}")
    print(f"  加载后 model: {loader.model is not None}")
    
    if loader.is_loaded and loader.model is not None:
        print("\n✅ 模型加载成功！")
        
        print("\n测试推理...")
        result = loader.infer("你好", max_new_tokens=10)
        print(f"  推理结果: {result}")
    else:
        print("\n❌ 模型加载失败")
        print(f"  is_loaded: {loader.is_loaded}")
        print(f"  model: {loader.model}")
        
except ImportError as e:
    print(f"❌ 导入失败: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)