#!/usr/bin/env python3
"""
调试模型加载过程
"""

import sys
import os
import traceback

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

print("=" * 80)
print("调试模型加载过程")
print("=" * 80)

# 检查模型路径
model_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34"
print(f"检查模型路径: {model_path}")
print(f"  路径存在: {os.path.exists(model_path)}")
if os.path.exists(model_path):
    files = os.listdir(model_path)
    print(f"  文件数量: {len(files)}")
    important_files = ["config.json", "model-1.bin", "model-2.bin", "model-3.bin", "model-4.bin", "model-5.bin"]
    for f in important_files:
        full = os.path.join(model_path, f)
        exists = os.path.exists(full)
        size = os.path.getsize(full) if exists else 0
        print(f"    {f}: {'存在' if exists else '缺失'} ({size:,} bytes)")

print("\n" + "=" * 80)
print("尝试导入 GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("  ✅ GenieContext 导入成功")
except Exception as e:
    print(f"  ❌ GenieContext 导入失败: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 80)
print("尝试创建 GenieContext 实例...")
config_path = os.path.join(model_path, "config.json")
print(f"配置路径: {config_path}")
print(f"  配置文件存在: {os.path.exists(config_path)}")

if os.path.exists(config_path):
    try:
        print("  正在创建 GenieContext...")
        context = GenieContext(config_path)
        print(f"  ✅ GenieContext 创建成功: {context}")
        print(f"  类型: {type(context)}")
        
        # 测试简单查询
        print("\n  测试简单查询...")
        result_parts = []
        def callback(text):
            result_parts.append(text)
            return True
        
        context.Query("测试", callback)
        result = ''.join(result_parts)
        print(f"  查询结果: {result[:100]}")
        
    except Exception as e:
        print(f"  ❌ GenieContext 创建失败: {e}")
        traceback.print_exc()
else:
    print("  ❌ 配置文件不存在")

print("\n" + "=" * 80)
print("测试 NPUModelLoader...")
print("=" * 80)

try:
    sys.path.insert(0, os.path.dirname(__file__))
    from models.model_loader import NPUModelLoader
    
    loader = NPUModelLoader()
    print(f"加载器创建: {loader}")
    print(f"  模型配置: {loader.model_config['name']}")
    print(f"  路径: {loader.model_config['path']}")
    print(f"  is_loaded: {loader.is_loaded}")
    print(f"  model: {loader.model}")
    
    print("\n  尝试调用 loader.load()...")
    try:
        model = loader.load()
        print(f"  load() 返回: {model is not None}")
        print(f"  加载后 is_loaded: {loader.is_loaded}")
        print(f"  加载后 model: {loader.model is not None}")
        
        if loader.model is not None:
            print("\n  测试推理...")
            result = loader.infer("你好", max_new_tokens=10)
            print(f"    推理结果: {result}")
            
    except Exception as e:
        print(f"  ❌ loader.load() 失败: {e}")
        traceback.print_exc()
        
except Exception as e:
    print(f"导入或创建失败: {e}")
    traceback.print_exc()

print("\n" + "=" * 80)
print("调试完成")
print("=" * 80)