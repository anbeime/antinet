#!/usr/bin/env python3
"""
Antinet智能知识管家 - 合规性验证脚本

验证项目是否符合高通AIPC赛道要求：
- NPU 推理延迟 < 500ms
- 数据不出域原则
- API 路由规范
- 代码质量检查

运行方法: python verify_compliance.py
"""

import time
import logging
from pathlib import Path
from typing import Dict, List, Tuple
import sys

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent


def verify_data_stays_local() -> bool:
    """
    验证所有数据处理在本地完成

    检查项:
    - backend/config.py 中 DATA_STAYS_LOCAL = True
    - API 路由不包含云端回调
    - 数据上传接口保存到本地
    """
    logger.info("=" * 60)
    logger.info("验证数据不出域原则")
    logger.info("=" * 60)

    try:
        from backend.config import settings

        # 检查配置
        assert settings.DATA_STAYS_LOCAL is True, "DATA_STAYS_LOCAL 必须为 True"
        logger.info("✓ DATA_STAYS_LOCAL = True")

        # 检查数据目录
        assert settings.DATA_DIR.exists(), f"数据目录不存在: {settings.DATA_DIR}"
        logger.info(f"✓ 数据目录存在: {settings.DATA_DIR}")

        # 检查上传目录
        upload_dir = settings.DATA_DIR / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"✓ 上传目录已创建: {upload_dir}")

        # 检查后端代码中的云端回调
        main_py = PROJECT_ROOT / "backend" / "main.py"
        content = main_py.read_text()

        forbidden_patterns = [
            "https://api.openai.com",
            "https://api.anthropic.com",
            "cloud.ollama.com",
            "requests.post(",
        ]

        for pattern in forbidden_patterns:
            assert pattern not in content, f"发现可疑的云端调用: {pattern}"

        logger.info("✓ 未发现云端API调用")

        logger.info("=" * 60)
        logger.info("✓ 数据不出域验证通过")
        logger.info("=" * 60)
        return True

    except AssertionError as e:
        logger.error(f"✗ 验证失败: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ 验证出错: {e}")
        return False


def verify_npu_performance() -> bool:
    """
    验证 NPU 推理延迟 < 500ms

    检查项:
    - 模型是否加载到 NPU
    - 平均推理延迟 < 500ms
    - 不同输入长度的延迟测试
    """
    logger.info("=" * 60)
    logger.info("验证 NPU 性能")
    logger.info("=" * 60)

    try:
        import numpy as np
        from backend.config import settings

        # 检查 QNN 设备配置
        logger.info(f"QNN 设备: {settings.QNN_DEVICE}")
        assert settings.QNN_DEVICE == "NPU", "QNN 设备必须为 NPU"
        logger.info("✓ QNN 设备配置正确")

        # 尝试加载模型
        logger.info(f"模型路径: {settings.MODEL_PATH}")

        if not settings.MODEL_PATH.exists():
            logger.warning("⚠ 模型文件不存在，跳过性能验证")
            logger.info("  请先运行模型转换: python backend/model_converter.py")
            logger.info("  然后在 AIPC 上运行: python backend/models/convert_to_qnn_on_aipc.py")
            return False

        try:
            import qai_appbuilder as qai

            model = qai.load_model(str(settings.MODEL_PATH), device=settings.QNN_DEVICE)
            logger.info("✓ 模型加载成功")

            # 性能测试
            test_results = []

            for seq_len in [32, 64, 128, 256]:
                logger.info(f"\n测试序列长度: {seq_len} tokens")

                # 预热
                for _ in range(3):
                    test_input = np.random.randint(0, 1000, (1, seq_len), dtype=np.int64)
                    model.infer(input_ids=test_input)

                # 正式测试
                latencies = []
                for _ in range(10):
                    test_input = np.random.randint(0, 1000, (1, seq_len), dtype=np.int64)

                    start = time.time()
                    output = model.infer(input_ids=test_input)
                    latency = (time.time() - start) * 1000
                    latencies.append(latency)

                avg_latency = sum(latencies) / len(latencies)
                min_latency = min(latencies)
                max_latency = max(latencies)

                test_results.append({
                    "sequence_length": seq_len,
                    "avg_latency_ms": avg_latency,
                    "min_latency_ms": min_latency,
                    "max_latency_ms": max_latency,
                })

                logger.info(f"  平均延迟: {avg_latency:.2f}ms")
                logger.info(f"  最小延迟: {min_latency:.2f}ms")
                logger.info(f"  最大延迟: {max_latency:.2f}ms")

                # 验证延迟 < 500ms
                if avg_latency >= 500:
                    logger.warning(f"  ⚠ 序列长度 {seq_len} 的平均延迟超过 500ms")
                else:
                    logger.info(f"  ✓ 序列长度 {seq_len} 的平均延迟符合要求")

            # 计算总体平均延迟
            overall_avg = sum(r["avg_latency_ms"] for r in test_results) / len(test_results)
            logger.info(f"\n总体平均延迟: {overall_avg:.2f}ms")

            # 保存测试结果
            benchmark_dir = PROJECT_ROOT / ".benchmarks"
            benchmark_dir.mkdir(exist_ok=True)

            import json
            from datetime import datetime

            result_file = benchmark_dir / f"npu_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(result_file, 'w') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "device": settings.QNN_DEVICE,
                    "model": settings.MODEL_NAME,
                    "results": test_results
                }, f, indent=2)

            logger.info(f"✓ 测试结果已保存: {result_file}")

            # 验证总体延迟
            if overall_avg < 500:
                logger.info("=" * 60)
                logger.info(f"✓ NPU 性能验证通过 (平均延迟: {overall_avg:.2f}ms)")
                logger.info("=" * 60)
                return True
            else:
                logger.error("=" * 60)
                logger.error(f"✗ NPU 性能验证失败 (平均延迟: {overall_avg:.2f}ms >= 500ms)")
                logger.error("=" * 60)
                return False

        except ImportError:
            logger.error("✗ QAI AppBuilder 未安装")
            logger.error("  请在 AIPC 上安装: pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl")
            return False

    except Exception as e:
        logger.error(f"✗ 验证出错: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_api_routes() -> bool:
    """
    验证 API 路由规范

    检查项:
    - 所有 API 路由使用 /api 前缀
    - 包含必需的 API 端点
    - Pydantic 模型定义完整
    """
    logger.info("=" * 60)
    logger.info("验证 API 路由规范")
    logger.info("=" * 60)

    try:
        main_py = PROJECT_ROOT / "backend" / "main.py"
        content = main_py.read_text()

        # 检查必需的 API 端点
        required_endpoints = [
            "/api/analyze",
            "/api/health",
            "/api/performance/benchmark",
            "/api/data/upload",
        ]

        for endpoint in required_endpoints:
            if endpoint in content:
                logger.info(f"✓ API 端点存在: {endpoint}")
            else:
                logger.error(f"✗ API 端点缺失: {endpoint}")
                return False

        # 检查 Pydantic 模型
        required_models = [
            "QueryRequest",
            "FourColorCard",
            "AnalysisResult",
        ]

        for model in required_models:
            if f"class {model}" in content:
                logger.info(f"✓ Pydantic 模型存在: {model}")
            else:
                logger.error(f"✗ Pydantic 模型缺失: {model}")
                return False

        # 检查错误处理
        error_codes = [503, 413, 500]
        for code in error_codes:
            if f"status_code={code}" in content:
                logger.info(f"✓ 错误处理存在: HTTP {code}")
            else:
                logger.warning(f"⚠ 错误处理可能缺失: HTTP {code}")

        logger.info("=" * 60)
        logger.info("✓ API 路由规范验证通过")
        logger.info("=" * 60)
        return True

    except Exception as e:
        logger.error(f"✗ 验证出错: {e}")
        return False


def verify_code_quality() -> bool:
    """
    验证代码质量

    检查项:
    - TypeScript strict mode
    - 无 any 类型
    - Tailwind CSS 使用
    """
    logger.info("=" * 60)
    logger.info("验证代码质量")
    logger.info("=" * 60)

    try:
        # 检查 TypeScript 配置
        tsconfig = PROJECT_ROOT / "tsconfig.json"
        content = tsconfig.read_text()

        if '"strict": true' in content:
            logger.info("✓ TypeScript strict mode 已启用")
        else:
            logger.error("✗ TypeScript strict mode 未启用")
            return False

        # 检查前端代码中的 any 类型
        src_dir = PROJECT_ROOT / "src"
        tsx_files = list(src_dir.rglob("*.tsx")) + list(src_dir.rglob("*.ts"))

        any_count = 0
        for file in tsx_files:
            content = file.read_text()
            # 排除注释中的 any
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                # 简单检查：: any 在代码中
                if ': any' in line and '//' not in line and '/*' not in line:
                    any_count += 1
                    logger.warning(f"  ⚠ 发现 any 类型: {file.name}:{i}")

        if any_count == 0:
            logger.info("✓ 未发现 any 类型使用")
        else:
            logger.warning(f"⚠ 发现 {any_count} 处 any 类型使用")

        # 检查 Tailwind CSS 使用
        package_json = PROJECT_ROOT / "package.json"
        content = package_json.read_text()

        if '"tailwindcss"' in content:
            logger.info("✓ Tailwind CSS 已安装")
        else:
            logger.error("✗ Tailwind CSS 未安装")
            return False

        # 检查是否有内联样式
        inline_style_count = 0
        for file in tsx_files:
            content = file.read_text()
            if 'style={{' in content:
                inline_style_count += content.count('style={{')

        if inline_style_count == 0:
            logger.info("✓ 未发现内联样式")
        else:
            logger.warning(f"⚠ 发现 {inline_style_count} 处内联样式使用")

        logger.info("=" * 60)
        logger.info("✓ 代码质量验证通过")
        logger.info("=" * 60)
        return True

    except Exception as e:
        logger.error(f"✗ 验证出错: {e}")
        return False


def verify_four_color_cards() -> bool:
    """
    验证四色卡片系统

    检查项:
    - 前端四色卡片类型定义
    - 后端四色卡片生成
    - 颜色映射正确
    """
    logger.info("=" * 60)
    logger.info("验证四色卡片系统")
    logger.info("=" * 60)

    try:
        # 检查前端类型定义
        home_tsx = PROJECT_ROOT / "src" / "pages" / "Home.tsx"
        content = home_tsx.read_text()

        card_types = ["blue", "green", "yellow", "red"]
        card_type_def = "type CardColor = 'blue' | 'green' | 'yellow' | 'red'"

        if card_type_def in content:
            logger.info("✓ 前端四色卡片类型定义正确")
        else:
            logger.error("✗ 前端四色卡片类型定义缺失")
            return False

        # 检查后端四色卡片生成
        main_py = PROJECT_ROOT / "backend" / "main.py"
        content = main_py.read_text()

        for color in card_types:
            if f'color="{color}"' in content:
                logger.info(f"✓ 后端支持卡片颜色: {color}")
            else:
                logger.error(f"✗ 后端不支持卡片颜色: {color}")
                return False

        # 检查四色卡片类别
        categories = ["事实", "解释", "风险", "行动"]
        for category in categories:
            if category in content:
                logger.info(f"✓ 后端支持卡片类别: {category}")
            else:
                logger.error(f"✗ 后端不支持卡片类别: {category}")
                return False

        logger.info("=" * 60)
        logger.info("✓ 四色卡片系统验证通过")
        logger.info("=" * 60)
        return True

    except Exception as e:
        logger.error(f"✗ 验证出错: {e}")
        return False


def generate_report(results: Dict[str, bool]) -> None:
    """生成验证报告"""
    logger.info("\n" + "=" * 60)
    logger.info("合规性验证总结")
    logger.info("=" * 60)

    total = len(results)
    passed = sum(results.values())
    failed = total - passed

    for test_name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        logger.info(f"{status}: {test_name}")

    logger.info("\n" + "-" * 60)
    logger.info(f"总计: {total} 项")
    logger.info(f"通过: {passed} 项")
    logger.info(f"失败: {failed} 项")
    logger.info(f"合规率: {passed / total * 100:.1f}%")
    logger.info("=" * 60)


def main():
    """主函数"""
    logger.info("\n" + "=" * 60)
    logger.info("Antinet智能知识管家 - 合规性验证")
    logger.info("=" * 60 + "\n")

    results = {
        "数据不出域原则": verify_data_stays_local(),
        "NPU 性能验证": verify_npu_performance(),
        "API 路由规范": verify_api_routes(),
        "代码质量检查": verify_code_quality(),
        "四色卡片系统": verify_four_color_cards(),
    }

    generate_report(results)

    # 返回退出码
    if all(results.values()):
        logger.info("\n✓ 所有验证通过！")
        return 0
    else:
        logger.info("\n✗ 部分验证失败，请检查上述问题")
        return 1


if __name__ == "__main__":
    sys.exit(main())
