"""
验证修复是否有效
"""
print("=" * 80)
print("验证修复")
print("=" * 80)

# 1. 检查语法
print("\n[1] 检查 model_loader.py 语法...")
import py_compile
try:
    py_compile.compile(r"c:\test\antinet\data-analysis\scripts\model_loader.py", doraise=True)
    print("    ✓ data-analysis/scripts/model_loader.py 语法正确")
except py_compile.PyCompileError as e:
    print(f"    ✗ 语法错误: {e}")

# 2. 检查 backend/models/model_loader.py
print("\n[2] 检查 backend/models/model_loader.py 语法...")
try:
    py_compile.compile(r"c:\test\antinet\backend\models\model_loader.py", doraise=True)
    print("    ✓ backend/models/model_loader.py 语法正确")
except py_compile.PyCompileError as e:
    print(f"    ✗ 语法错误: {e}")

# 3. 检查导入
print("\n[3] 测试导入 backend/models/model_loader...")
try:
    import sys
    import os

    # 添加到路径
    if r"c:\test\antinet\backend" not in sys.path:
        sys.path.insert(0, r"c:\test\antinet\backend")

    # 设置环境变量
    lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
    bridge_lib_path = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
    paths_to_add = [bridge_lib_path, lib_path]
    current_path = os.environ.get('PATH', '')
    for p in paths_to_add:
        if p not in current_path:
            current_path = p + ';' + current_path
    os.environ['PATH'] = current_path
    os.environ['QNN_LOG_LEVEL'] = "DEBUG"

    # 添加DLL目录
    for p in paths_to_add:
        if os.path.exists(p):
            try:
                os.add_dll_directory(p)
            except:
                pass

    # 导入
    import models.model_loader
    print("    ✓ 导入成功")
    print(f"    - HAS_QAI_HUB: {models.model_loader.HAS_QAI_HUB}")
except Exception as e:
    print(f"    ✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("验证完成")
print("=" * 80)
