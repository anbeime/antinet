#!/usr/bin/env python3
"""测试路由导入"""

import sys
from pathlib import Path

backend_dir = Path("C:/test/antinet/backend")
sys.path.insert(0, str(backend_dir))

print("测试路由导入...")
print("=" * 80)

# 测试 agent_routes
print("\n1. agent_routes:")
try:
    from routes.agent_routes import router as agent_router
    print("   ✓ 导入成功")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")

# 测试 excel_routes
print("\n2. excel_routes:")
try:
    from routes.excel_routes import router as excel_router
    print("   ✓ 导入成功")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")

# 测试 analysis_routes
print("\n3. analysis_routes:")
try:
    from routes.analysis_routes import router as analysis_router
    print("   ✓ 导入成功")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")

# 测试 pdf_routes
print("\n4. pdf_routes:")
try:
    from routes.pdf_routes import router as pdf_router
    print("   ✓ 导入成功")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")

print("\n" + "=" * 80)
