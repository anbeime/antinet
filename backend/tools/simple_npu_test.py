"""简单NPU测试"""
from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
from pathlib import Path

print("NPU 简单测试")

# 配置QNN
qnn_libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")
QNNConfig.Config(str(qnn_libs_path), Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)

# 尝试加载模型
model_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34"
try:
    model = QNNContext("test", model_path)
    print(f"[OK] 模型加载成功: {type(model)}")
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()

print("测试完成")
