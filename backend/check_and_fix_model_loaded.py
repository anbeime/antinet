#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查并修复 model_loaded 标志
运行此脚本以解决前端显示"模拟模式"问题
"""

import sys
import os

# 添加当前目录到路径
sys.path.append(os.path.dirname(__file__))

def check_and_fix():
    """检查并修复 model_loaded 标志"""
    try:
        from models.model_loader import _global_model_loader
        
        print("=" * 60)
        print("检查模型加载状态")
        print("=" * 60)
        
        if _global_model_loader is None:
            print("❌ 全局模型加载器未初始化")
            print("   请确保后端已启动并加载模型")
            return False
        
        print(f"全局模型加载器: 已创建")
        print(f"  is_loaded: {_global_model_loader.is_loaded}")
        print(f"  model: {'已设置' if _global_model_loader.model is not None else 'None'}")
        print(f"  模型配置: {_global_model_loader.model_config['name']}")
        
        # 如果 model 存在但 is_loaded 为 False，则修复
        if _global_model_loader.model is not None and not _global_model_loader.is_loaded:
            print("\n⚠️  检测到问题：model 已存在但 is_loaded=False")
            print("   正在修复...")
            _global_model_loader.is_loaded = True
            print("   ✅ 已将 is_loaded 设置为 True")
            
            # 验证修复
            print(f"\n验证修复：")
            print(f"  is_loaded: {_global_model_loader.is_loaded}")
            print(f"  model: {'已设置' if _global_model_loader.model is not None else 'None'}")
            
            return True
        
        elif _global_model_loader.is_loaded:
            print("\n✅ 状态正常：model_loaded=True")
            return True
        
        else:
            print("\n❌ 状态异常：model=None 且 is_loaded=False")
            print("   可能需要重新加载模型")
            return False
            
    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        print("   请确保在 backend 目录中运行此脚本")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_health_endpoint():
    """测试 /api/health 端点"""
    try:
        import requests
        
        print("\n" + "=" * 60)
        print("测试 /api/health 端点")
        print("=" * 60)
        
        response = requests.get("http://localhost:8000/api/health", timeout=5)
        data = response.json()
        
        print(f"状态码: {response.status_code}")
        print(f"model_loaded: {data.get('model_loaded')}")
        print(f"device: {data.get('device')}")
        
        if data.get('model_loaded'):
            print("✅ 健康端点报告模型已加载")
            return True
        else:
            print("❌ 健康端点报告模型未加载")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    print("Antinet 智能知识管家 - 模型加载状态检查工具")
    print("=" * 60)
    
    # 检查后端是否运行
    try:
        import requests
        requests.get("http://localhost:8000", timeout=2)
        print("✓ 后端服务运行中")
    except:
        print("⚠️  后端服务未运行，请先启动后端")
        print("   在 backend 目录运行: python main.py")
        sys.exit(1)
    
    # 执行检查和修复
    fixed = check_and_fix()
    
    # 测试健康端点
    test_health_endpoint()
    
    print("\n" + "=" * 60)
    if fixed:
        print("✅ 修复完成！")
        print("   前端应显示 'NPU加速' 而非 '模拟模式'")
    else:
        print("⚠️  未能自动修复")
        print("   请检查后端日志或手动调试")
    
    print("=" * 60)
    print("\n提示：如果问题仍然存在，请尝试重启后端服务")