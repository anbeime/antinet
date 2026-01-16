#!/usr/bin/env python3
"""
GenieContext 备选方案测试脚本
如果 GenieContext 持续失败，使用这个备选方案
"""

import time
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_genie_api_service():
    """测试 GenieAPIService.exe HTTP API"""
    import requests

    try:
        # 启动 GenieAPIService.exe (需要手动启动)
        # C:/ai-engine-direct-helper/samples/genie/bin/GenieAPIService.exe

        url = "http://localhost:5000/query"
        payload = {
            "prompt": "分析销售数据趋势",
            "max_tokens": 512,
            "temperature": 0.7
        }

        start_time = time.time()
        response = requests.post(url, json=payload, timeout=30)
        inference_time = (time.time() - start_time) * 1000

        if response.status_code == 200:
            result = response.json()
            logger.info(f"[SUCCESS] HTTP API 推理成功: {inference_time:.2f}ms")
            return result
        else:
            logger.error(f"[ERROR] HTTP API 失败: {response.status_code}")
            return None

    except Exception as e:
        logger.error(f"[ERROR] HTTP API 测试失败: {e}")
        return None

def test_direct_qnn_context():
    """测试直接使用 QNNContext"""
    try:
        from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel

        # 配置 QNN
        qnn_libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")
        if qnn_libs_path.exists():
            QNNConfig.Config(str(qnn_libs_path), Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)
        else:
            QNNConfig.Config('', Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)

        # 尝试直接创建 QNNContext
        model_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34"
        context = QNNContext("Qwen2.0-7B-SSD", model_path)

        logger.info("[SUCCESS] 直接 QNNContext 创建成功")
        return context

    except Exception as e:
        logger.error(f"[ERROR] 直接 QNNContext 失败: {e}")
        return None

def test_model_file_integrity():
    """检查模型文件完整性"""
    model_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")

    if not model_path.exists():
        logger.error(f"[ERROR] 模型路径不存在: {model_path}")
        return False

    # 检查关键文件
    required_files = ['config.json', 'model-1.bin', 'model-2.bin']
    missing_files = []

    for file in required_files:
        if not (model_path / file).exists():
            missing_files.append(file)

    if missing_files:
        logger.error(f"[ERROR] 模型文件不完整，缺少: {missing_files}")
        return False

    logger.info("[SUCCESS] 模型文件完整性检查通过")
    return True

if __name__ == "__main__":
    print("=== GenieContext 备选方案测试 ===")

    # 1. 检查模型文件
    print("\n1. 检查模型文件完整性...")
    test_model_file_integrity()

    # 2. 测试直接 QNNContext
    print("\n2. 测试直接 QNNContext...")
    context = test_direct_qnn_context()

    # 3. 测试 HTTP API (如果可用)
    print("\n3. 测试 GenieAPIService HTTP API...")
    result = test_genie_api_service()

    print("\n=== 测试完成 ===")