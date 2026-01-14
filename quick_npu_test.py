import sys
sys.path.insert(0, 'backend')

from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
from pathlib import Path

print("=" * 70)
print("NPU 真实推理测试")
print("=" * 70)

# 配置 QNN
qnn_libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")
print(f"\n[1] 配置 QNN 环境...")
print(f"    库路径: {qnn_libs_path}")

try:
    QNNConfig.Config(str(qnn_libs_path), Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)
    print("[OK] QNN 环境配置完成")
except Exception as e:
    print(f"[ERROR] QNN 配置失败: {e}")
    sys.exit(1)

# 尝试加载模型
print(f"\n[2] 加载模型...")
model_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34"
print(f"    模型路径: {model_path}")

try:
    model = QNNContext("test", model_path)
    print(f"[OK] 模型加载成功: {type(model).__name__}")
    print(f"    设备: NPU (Hexagon)")
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("测试完成！")
print("=" * 70)
