import os
import sys

# 添加路径
sys.path.insert(0, r"C:\ai-engine-direct-helper\samples\genie\python")
qai_libs = r"C:\ai-engine-direct-helper\samples\qai_libs"
qairt_libs = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"

# 设置环境变量
os.environ['PATH'] = f"{qai_libs};{qairt_libs};{os.environ.get('PATH', '')}"
os.environ['QNN_LOG_LEVEL'] = 'DEBUG'

# 添加DLL目录
for p in [qai_libs, qairt_libs]:
    if os.path.exists(p):
        os.add_dll_directory(p)

print("开始导入qai_appbuilder...")
try:
    from qai_appbuilder import GenieContext
    print("导入成功")
except Exception as e:
    print(f"导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("开始创建GenieContext...")
config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
print(f"Config路径: {config_path}")

try:
    genie = GenieContext(config_path)
    print("GenieContext创建成功")
except Exception as e:
    print(f"GenieContext创建失败: {e}")
    import traceback
    traceback.print_exc()
