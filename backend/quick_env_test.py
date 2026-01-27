#!/usr/bin/env python3
"""快速环境测试 - 验证依赖和配置"""
import os
import sys

# 添加 backend 目录到 Python 路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

print("=" * 60)
print("环境测试 - Antinet 后端")
print("=" * 60)

# 1. Python 版本
print(f"\n1. Python 版本:")
print(f"   版本: {sys.version}")
print(f"   路径: {sys.executable}")

# 2. 虚拟环境检查
print(f"\n2. 虚拟环境检查:")
venv_path = sys.executable
is_venv = "venv_arm64" in venv_path
print(f"   是否使用虚拟环境: {'✓ 是' if is_venv else '✗ 否'}")
print(f"   虚拟环境路径: {venv_path}")

# 3. 依赖检查
print(f"\n3. 核心依赖检查:")

dependencies = {
    "fastapi": "FastAPI",
    "uvicorn": "Uvicorn",
    "pydantic": "Pydantic",
    "numpy": "NumPy",
}

missing_deps = []
for dep, name in dependencies.items():
    try:
        __import__(dep)
        print(f"   ✓ {name}")
    except ImportError:
        print(f"   ✗ {name} - 未安装")
        missing_deps.append(dep)

# 4. NPU 库检查
print(f"\n4. NPU 库检查:")
npu_lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

print(f"   QAI 库路径: {npu_lib_path}")
print(f"   状态: {'✓ 存在' if os.path.exists(npu_lib_path) else '✗ 不存在'}")
print(f"   Bridge 库路径: {bridge_lib_path}")
print(f"   状态: {'✓ 存在' if os.path.exists(bridge_lib_path) else '✗ 不存在'}")

# 5. QAI AppBuilder 检查
print(f"\n5. QAI AppBuilder 检查:")
try:
    import qai_appbuilder
    print(f"   ✓ QAI AppBuilder 已安装")
except ImportError:
    print(f"   ✗ QAI AppBuilder 未安装")
    missing_deps.append("qai_appbuilder")

# 6. 数据库检查
print(f"\n6. 数据库检查:")
db_path = os.path.join(project_root, "antinet.db")
print(f"   数据库路径: {db_path}")
print(f"   状态: {'✓ 存在' if os.path.exists(db_path) else '✗ 不存在'}")

# 7. 配置检查
print(f"\n7. 配置检查:")
try:
    from config import settings
    print(f"   ✓ 配置文件加载成功")
    print(f"   数据库URL: {settings.DATABASE_URL[:50]}...")
except Exception as e:
    print(f"   ✗ 配置文件加载失败: {e}")

# 总结
print("\n" + "=" * 60)
print("测试总结")
print("=" * 60)

if missing_deps:
    print(f"\n✗ 缺少 {len(missing_deps)} 个依赖包:")
    for dep in missing_deps:
        print(f"   - {dep}")
    print(f"\n请运行: pip install {' '.join(missing_deps)}")
else:
    print(f"\n✓ 所有核心依赖已安装")

print(f"\n建议操作:")
if is_venv:
    print(f"  ✓ 虚拟环境正确激活")
else:
    print(f"  ✗ 请使用 ARM64 虚拟环境: c:\\test\\antinet\\venv_arm64\\Scripts\\activate")

if not missing_deps and is_venv:
    print(f"  ✓ 环境准备就绪,可以启动后端")
    print(f"  启动命令: python backend/main.py")
else:
    print(f"  ✗ 环境未完全准备,请先解决上述问题")

print("\n" + "=" * 60)
