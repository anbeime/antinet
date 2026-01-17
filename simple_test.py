import sys
import os
import traceback

print("简单测试 GenieContext")

# 设置 PATH
lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
os.environ['PATH'] = lib_path + ";" + os.environ.get('PATH', '')
print(f"PATH 已设置: {lib_path}")

# 导入
try:
    from qai_appbuilder import GenieContext
    print("导入 GenieContext 成功")
except ImportError as e:
    print(f"导入失败: {e}")
    sys.exit(1)

config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
if not os.path.exists(config_path):
    print(f"配置文件不存在: {config_path}")
    sys.exit(1)

print(f"配置文件: {config_path}")

try:
    print("创建 GenieContext 实例...")
    genie = GenieContext(config_path)
    print("成功！")
except Exception as e:
    print(f"失败: {e}")
    traceback.print_exc()