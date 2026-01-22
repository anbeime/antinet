#!/usr/bin/env python3
"""
直接检查模型加载状态
"""

import sys
import os

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
print("直接检查模型加载状态")
print("=" * 80)

try:
    # 导入模型加载器
    sys.path.insert(0, os.path.dirname(__file__))
    from models.model_loader import _global_model_loader, get_model_loader
    
    print("1. 检查 _global_model_loader...")
    if _global_model_loader is None:
        print("   ❌ _global_model_loader 为 None")
        print("\n2. 尝试调用 get_model_loader()...")
        loader = get_model_loader()
        print(f"   返回的 loader: {loader}")
        print(f"   loader.is_loaded: {loader.is_loaded}")
        print(f"   loader.model exists: {loader.model is not None}")
        
        # 重新检查全局变量
        from models.model_loader import _global_model_loader
        print(f"\n3. 重新检查 _global_model_loader: {_global_model_loader is not None}")
        if _global_model_loader is not None:
            print(f"   loader.is_loaded: {_global_model_loader.is_loaded}")
            print(f"   loader.model exists: {_global_model_loader.model is not None}")
    else:
        print(f"   ✓ _global_model_loader 已存在")
        print(f"      is_loaded: {_global_model_loader.is_loaded}")
        print(f"      model exists: {_global_model_loader.model is not None}")
        print(f"      模型名称: {_global_model_loader.model_config['name']}")
        
        # 如果模型存在但 is_loaded 为 False，尝试修正
        if _global_model_loader.model is not None and not _global_model_loader.is_loaded:
            print("\n⚠️  检测到不一致：model exists but is_loaded=False")
            print("   尝试手动设置 is_loaded=True...")
            _global_model_loader.is_loaded = True
            print("   ✓ 已设置 is_loaded=True")
            
        # 尝试调用 load() 方法
        if not _global_model_loader.is_loaded:
            print("\n尝试调用 loader.load()...")
            try:
                model = _global_model_loader.load()
                print(f"   load() 成功，is_loaded: {_global_model_loader.is_loaded}")
            except Exception as e:
                print(f"   ❌ load() 失败: {e}")
                import traceback
                traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("测试 /api/health 端点...")
    print("=" * 80)
    
    import requests
    try:
        resp = requests.get("http://localhost:8000/api/health", timeout=5)
        print(f"状态码: {resp.status_code}")
        data = resp.json()
        print(f"返回数据: {data}")
        
        # 检查不一致性
        if data.get('status') == 'healthy' and not data.get('model_loaded'):
            print("\n⚠️  端点仍然不一致：status='healthy' 但 model_loaded=False")
            print("   可能需要重启后端服务")
        elif data.get('model_loaded'):
            print("\n✅ 端点报告模型已加载！")
        else:
            print("\n❌ 端点报告模型未加载")
            
    except Exception as e:
        print(f"请求失败: {e}")
        
except ImportError as e:
    print(f"导入失败: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"未知错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("诊断完成")
print("=" * 80)