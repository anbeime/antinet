"""
简单的Genie导入测试
"""
import os
import sys

print("=" * 80)
print("Genie导入测试")
print("=" * 80)

# 设置路径
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
            print(f"✓ 已添加DLL目录: {os.path.basename(p)}")
        except Exception as e:
            print(f"✗ 添加失败: {e}")

# 导入
print("\n正在导入GenieContext...")
try:
    sys.path.insert(0, r"C:\ai-engine-direct-helper\samples\genie\python")
    from qai_appbuilder import GenieContext
    print("✓ GenieContext导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
