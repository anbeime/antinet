"""GenieContext 加载测试"""
import sys
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')

print("测试 GenieContext 导入...")
try:
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext 导入成功")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

print("\n[1] 配置环境...")
import os
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
os.environ['PATH'] = os.getenv('PATH', '') + ";" + lib_path
print(f"    QNN 库已添加到 PATH")

print("\n[2] 检查文件...")
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"    配置路径: {config_path}")

import os
if not os.path.exists(config_path):
    print(f"[ERROR] 文件不存在: {config_path}")
    sys.exit(1)

print("[OK] 文件存在")

print("\n[3] 加载模型...")
try:
    genie = GenieContext(config_path, False)
    print(f"[OK] 模型加载成功！")
    print(f"    类型: {type(genie).__name__}")
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试完成")
