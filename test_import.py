#!/usr/bin/env python3
"""测试导入 analysis_advanced_routes"""
import sys
import os

# 添加 backend 目录到路径
backend_dir = r'C:\test\antinet\backend'
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from routes.analysis_advanced_routes import router
    print("✅ 高级数据分析路由导入成功")
    print(f"   路由前缀: {router.prefix}")
    print(f"   路由标签: {router.tags}")
except Exception as e:
    print(f"❌ 导入失败: {e}")
    import traceback
    traceback.print_exc()
