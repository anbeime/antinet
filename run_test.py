import sys
import os
import traceback

# 设置 PATH
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if lib_path not in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print(f"[INFO] PATH 已设置: {lib_path}")

try:
    from qai_appbuilder import GenieContext
    print("[INFO] 导入 GenieContext 成功")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
if not os.path.exists(config_path):
    print(f"[ERROR] 配置文件不存在: {config_path}")
    sys.exit(1)

print(f"[INFO] 配置文件: {config_path}")
print("[INFO] 尝试创建 GenieContext 实例...")
try:
    genie = GenieContext(config_path)
    print("[SUCCESS] GenieContext 创建成功!")
    print(f"       对象类型: {type(genie).__name__}")
except Exception as e:
    print(f"[FAILURE] GenieContext 创建失败:")
    traceback.print_exc()