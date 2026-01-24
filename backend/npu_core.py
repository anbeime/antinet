"""
NPU推理核心模块
使用 GenieContext 处理大模型（7B+）
"""
import time
import logging
import os
from typing import Optional, Callable
from qai_appbuilder import GenieContext

# qai_hub_models是可选的，仅用于性能配置（BURST模式）
PerfProfile = None
try:
    from qai_hub_models.models._shared.perf_profile import PerfProfile
except ImportError:
    pass

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NPUInferenceCore:
    """NPU推理核心类 - 使用 GenieContext"""

    def __init__(self, model_config_path: Optional[str] = None, qai_libs_path: str = r"C:\ai-engine-direct-helper\samples\qai_libs"):
        """
        初始化NPU推理核心

        Args:
            model_config_path: 模型配置文件路径（config.json）
            qai_libs_path: QAI库路径
        """
        self.model_config_path = model_config_path or r"C:\test\antinet\config.json"
        self.qai_libs_path = qai_libs_path
        self.model: Optional[GenieContext] = None
        self.is_loaded = False

        # 设置PATH环境变量
        if self.qai_libs_path not in os.getenv('PATH', ''):
            os.environ['PATH'] = self.qai_libs_path + ";" + os.getenv('PATH', '')
            logger.info(f"[OK] 已添加 QAI库路径到PATH")

    def load_model(self):
        """加载模型到NPU"""
        try:
            start_time = time.time()

            # 验证配置文件存在
            if not os.path.exists(self.model_config_path):
                raise FileNotFoundError(f"模型配置文件不存在: {self.model_config_path}")

            # 创建 GenieContext（只传入config路径）
            self.model = GenieContext(self.model_config_path)

            # 启用BURST性能模式以优化延迟（如果qai_hub_models可用）
            try:
                if PerfProfile is not None:
                    PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                    logger.info("[OK] 已启用BURST性能模式")
                else:
                    logger.info("[INFO] 使用默认性能配置（qai_hub_models未安装）")
            except Exception as e:
                logger.warning(f"[WARNING] 启用BURST模式失败: {e}")

            self.is_loaded = True

            load_time = (time.time() - start_time) * 1000
            logger.info(f"[OK] 模型加载成功 ({load_time:.2f}ms)")
            logger.info(f"[OK] 运行设备: NPU (Hexagon)")

            return True
        except Exception as e:
            logger.error(f"[ERROR] 模型加载失败: {e}")
            self.is_loaded = False
            raise

    def infer(self, prompt: str, callback: Optional[Callable[[str], bool]] = None) -> tuple[str, float]:
        """
        执行NPU推理

        Args:
            prompt: 输入提示词
            callback: 回调函数，用于处理流式输出

        Returns:
            (推理结果, 推理延迟ms)
        """
        if not self.is_loaded:
            raise RuntimeError("模型未加载，请先调用 load_model()")

        try:
            start_time = time.time()

            # 如果没有提供回调函数，使用默认的字符串收集器
            if callback is None:
                result_parts = []

                def default_callback(text: str) -> bool:
                    result_parts.append(text)
                    return True

                callback = default_callback

            # 执行推理
            self.model.Query(prompt, callback)

            # 组合结果
            result = ''.join(result_parts) if result_parts else ""

            infer_time = (time.time() - start_time) * 1000
            logger.info(f"[OK] 推理完成 ({infer_time:.2f}ms)")

            # 检查性能指标
            if infer_time > 500:
                logger.warning(f"[WARNING] 推理延迟超标: {infer_time:.2f}ms (目标 < 500ms)")

            return result, infer_time

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            raise

    def get_model_info(self) -> dict:
        """获取模型信息"""
        if not self.is_loaded:
            return {"status": "not_loaded"}

        return {
            "status": "loaded",
            "config_path": self.model_config_path,
            "model_type": "GenieContext (LLM)",
            "device": "NPU (Hexagon)"
        }


# 便捷函数
def create_npu_core(model_config_path: Optional[str] = None) -> NPUInferenceCore:
    """创建NPU推理核心实例"""
    return NPUInferenceCore(model_config_path)
