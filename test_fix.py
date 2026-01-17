#!/usr/bin/env python3
"""
测试 QNNConfig 导入问题
"""
import os
os.environ['PATH'] = 'C:/ai-engine-direct-helper/samples/qai_libs;' + os.getenv('PATH', '')

# 模拟 model_loader 中的导入
try:
    from qai_appbuilder import QNNContext, GenieContext, Runtime, LogLevel, ProfilingLevel, PerfProfile, QNNConfig
    QAI_AVAILABLE = True
    print(f"QAI_AVAILABLE: {QAI_AVAILABLE}")
    print(f"QNNConfig type: {type(QNNConfig)}")
except ImportError:
    QAI_AVAILABLE = False
    print("QAI AppBuilder 未安装")

# 测试 QNNConfig.Config 调用
if QAI_AVAILABLE:
    try:
        QNNConfig.Config(
            "C:/ai-engine-direct-helper/samples/qai_libs",
            Runtime.HTP,
            LogLevel.INFO,
            ProfilingLevel.BASIC,
            "None"
        )
        print("[OK] QNNConfig.Config 调用成功")
    except Exception as e:
        print(f"[ERROR] QNNConfig.Config 失败: {e}")
        import traceback
        traceback.print_exc()