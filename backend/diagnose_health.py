#!/usr/bin/env python3
"""
诊断健康检查端点问题
"""

import sys
import os
import logging

# 设置环境变量 - 与main.py相同
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

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("=" * 60)
print("诊断健康检查端点")
print("=" * 60)

try:
    from models.model_loader import _global_model_loader, get_model_loader
    
    print("1. 检查全局模型加载器...")
    if _global_model_loader is None:
        print("   ❌ _global_model_loader 为 None")
        print("   尝试调用 get_model_loader()...")
        loader = get_model_loader()
        print(f"   获取的 loader: {loader}")
        print(f"   loader.is_loaded: {loader.is_loaded}")
        print(f"   loader.model: {loader.model is not None}")
    else:
        print(f"   ✓ _global_model_loader 已存在")
        print(f"      is_loaded: {_global_model_loader.is_loaded}")
        print(f"      model: {'已设置' if _global_model_loader.model is not None else 'None'}")
        print(f"      模型名称: {_global_model_loader.model_config['name']}")
        
        # 检查模型实例
        if _global_model_loader.model is not None:
            print(f"      模型类型: {type(_global_model_loader.model)}")
            
        # 尝试手动加载
        if not _global_model_loader.is_loaded and _global_model_loader.model is None:
            print("\n2. 尝试手动加载模型...")
            try:
                model = _global_model_loader.load()
                print(f"   load() 返回: {model is not None}")
                print(f"   加载后 is_loaded: {_global_model_loader.is_loaded}")
            except Exception as e:
                print(f"   ❌ 加载失败: {e}")
                import traceback
                traceback.print_exc()
    
except ImportError as e:
    print(f"❌ 导入失败: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ 未知错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("测试 /api/health 端点逻辑...")
print("=" * 60)

# 测试健康检查端点的逻辑
try:
    from models.model_loader import _global_model_loader
    
    is_loaded = False
    if _global_model_loader is not None:
        is_loaded = _global_model_loader.is_loaded
        print(f"从全局加载器获取 is_loaded: {is_loaded}")
    else:
        print("全局加载器不存在")
    
    # 计算状态
    status = "healthy" if is_loaded else "degraded"
    print(f"计算的 status: {status}")
    print(f"返回的 model_loaded: {is_loaded}")
    
    # 显示不一致性
    if status == "healthy" and not is_loaded:
        print("\n⚠️  不一致：status='healthy' 但 model_loaded=False")
        print("  这可能意味着 status 逻辑有误")
    elif status == "degraded" and is_loaded:
        print("\n⚠️  不一致：status='degraded' 但 model_loaded=True")
    else:
        print("\n✓ 状态一致")
        
except Exception as e:
    print(f"测试失败: {e}")

print("\n" + "=" * 60)
print("诊断完成")
print("=" * 60)