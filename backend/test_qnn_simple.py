"""简单测试 QNNContext"""
import sys

print("测试 QAI AppBuilder 导入...")
try:
    from qai_appbuilder import QNNContext, Runtime, LogLevel, ProfilingLevel
    print("[OK] 导入成功")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

print("\n测试 QNNConfig.Config()...")
try:
    from qai_appbuilder import QNNConfig
    QNNConfig.Config(
        qnn_lib_path='',
        runtime=Runtime.HTP,
        log_level=LogLevel.INFO,
        profiling_level=ProfilingLevel.BASIC
    )
    print("[OK] QNNConfig.Config() 成功")
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {e}")

print("\n测试 QNNContext 实例化...")
try:
    model = QNNContext('test', 'C:/model/Qwen2.0-7B-SSD-8380-2.34')
    print(f"[OK] QNNContext 创建成功: {type(model)}")
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {e}")

print("\n完成")
