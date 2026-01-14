import sys
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')

from qai_appbuilder import GenieContext
from pathlib import Path

print("=" * 70)
print("NPU 真实推理测试")
print("=" * 70)

# 尝试加载模型
print(f"\n[1] 配置环境...")
# 添加 QNN 库到 PATH（参考 ChainUtils.py 的做法）
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
import os
os.environ['PATH'] = os.getenv('PATH', '') + ";" + lib_path
print(f"    QNN 库已添加到 PATH")

print(f"\n[2] 加载模型...")
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"    配置路径: {config_path}")

try:
    genie = GenieContext(config_path, False)
    print(f"[OK] 模型加载成功！")
    print(f"    类型: {type(genie).__name__}")
    print(f"    设备: NPU (Genie)")
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("测试完成！")
print("=" * 70)
