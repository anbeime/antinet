#!/usr/bin/env python3
"""
QNN环境诊断脚本 - 基于高通开发文档的系统性检查
"""

import os
import sys
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def check_qnn_libs():
    """检查QNN库文件"""
    qnn_libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")

    if not qnn_libs_path.exists():
        logger.error(f"❌ QNN库路径不存在: {qnn_libs_path}")
        return False

    # 检查关键DLL文件
    required_dlls = [
        "QnnCpu.dll", "QnnHtp.dll", "QnnSystem.dll",
        "QnnHtpV73Stub.dll", "QnnHtpPrepare.dll"
    ]

    missing_dlls = []
    for dll in required_dlls:
        if not (qnn_libs_path / dll).exists():
            missing_dlls.append(dll)

    if missing_dlls:
        logger.error(f"❌ 缺少QNN库文件: {missing_dlls}")
        return False

    logger.info("✅ QNN库文件完整")
    return True

def check_model_files():
    """检查模型文件完整性"""
    model_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")

    if not model_path.exists():
        logger.error(f"❌ 模型路径不存在: {model_path}")
        return False

    # 检查关键文件
    required_files = [
        "config.json",
        "tokenizer.json",
        "model-1.bin", "model-2.bin", "model-3.bin", "model-4.bin", "model-5.bin"
    ]

    missing_files = []
    for file in required_files:
        if not (model_path / file).exists():
            missing_files.append(file)

    if missing_files:
        logger.error(f"❌ 模型文件不完整，缺少: {missing_files}")
        return False

    logger.info("✅ 模型文件完整")
    return True

def check_environment_variables():
    """检查环境变量"""
    required_vars = {
        "QNN_LOG_LEVEL": "DEBUG",
        "QAI_APPBUILDER_PATH": "C:/ai-engine-direct-helper"
    }

    for var, expected in required_vars.items():
        current = os.environ.get(var)
        if current != expected:
            logger.warning(f"⚠️ 环境变量 {var}: 当前={current}, 建议={expected}")

    logger.info("✅ 环境变量检查完成")

def check_qai_appbuilder_import():
    """检查QAI AppBuilder导入"""
    try:
        import qai_appbuilder
        logger.info("✅ QAI AppBuilder 可导入")

        # 检查关键类
        from qai_appbuilder import QNNContext, GenieContext, QNNConfig
        logger.info("✅ 关键类可导入: QNNContext, GenieContext, QNNConfig")

        return True
    except ImportError as e:
        logger.error(f"❌ QAI AppBuilder 导入失败: {e}")
        return False

def test_qnn_config():
    """测试QNN配置"""
    try:
        from qai_appbuilder import QNNConfig, Runtime, LogLevel, ProfilingLevel

        # 测试配置
        qnn_libs_path = "C:/ai-engine-direct-helper/samples/qai_libs"
        if Path(qnn_libs_path).exists():
            QNNConfig.Config(qnn_libs_path, Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)
            logger.info("✅ QNN配置成功 (使用指定库路径)")
        else:
            QNNConfig.Config("", Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)
            logger.info("✅ QNN配置成功 (使用默认路径)")

        return True
    except Exception as e:
        logger.error(f"❌ QNN配置失败: {e}")
        return False

def main():
    """主诊断函数"""
    print("=" * 60)
    print("QNN环境诊断 - 基于高通开发文档")
    print("=" * 60)

    checks = [
        ("QNN库文件", check_qnn_libs),
        ("模型文件", check_model_files),
        ("环境变量", check_environment_variables),
        ("QAI导入", check_qai_appbuilder_import),
        ("QNN配置", test_qnn_config),
    ]

    results = []
    for name, check_func in checks:
        print(f"\n🔍 检查: {name}")
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            logger.error(f"❌ 检查失败: {e}")
            results.append((name, False))

    # 总结
    print("\n" + "=" * 60)
    print("诊断结果总结:")
    print("=" * 60)

    all_passed = True
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
        if not result:
            all_passed = False

    if all_passed:
        print("\n🎉 所有检查通过！可以尝试加载模型。")
    else:
        print("\n⚠️ 部分检查失败，请根据上述错误信息修复问题。")

    return all_passed

if __name__ == "__main__":
    main()