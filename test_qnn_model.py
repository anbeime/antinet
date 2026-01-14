"""QNNContext 模型加载测试 - 直接加载目录"""
import sys
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')

from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
from pathlib import Path

print("=" * 70)
print("测试 QNNContext 加载目录")
print("=" * 70)

# 配置 QNN
qnn_libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")
print(f"\n[1] 配置 QNN 环境...")
try:
    QNNConfig.Config(str(qnn_libs_path), Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)
    print("[OK] QNN 环境配置完成")
except Exception as e:
    print(f"[ERROR] QNN 配置失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 尝试加载模型 - 方式1: 直接传目录
print(f"\n[2] 测试方式1: 直接传目录...")
model_dir = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
try:
    model = QNNContext("test", str(model_dir))
    print(f"[OK] 模型加载成功！")
    print(f"    类型: {type(model).__name__}")
    print(f"    设备: NPU (QNN)")
except Exception as e:
    print(f"[ERROR] 方式1失败: {e}")

# 方式2: 传单个 .bin 文件
print(f"\n[3] 测试方式2: 传单个 .bin 文件...")
try:
    model_bin = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34/model-1.bin")
    model = QNNContext("test", str(model_bin))
    print(f"[OK] 模型加载成功！")
    print(f"    类型: {type(model).__name__}")
except Exception as e:
    print(f"[ERROR] 方式2失败: {e}")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
