"""
NPU 模型加载器
支持加载远程 AIPC 预装的 QNN 模型
"""
import os
import time
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

# 注意：qai_appbuilder 仅在 AIPC 上可用
try:
    from qai_appbuilder import QNNContext, Runtime, LogLevel, ProfilingLevel, PerfProfile
    QAI_AVAILABLE = True
except ImportError:
    QAI_AVAILABLE = False
    print("[WARNING] QAI AppBuilder 未安装，模拟模式运行")

logger = logging.getLogger(__name__)


class ModelConfig:
    """模型配置类"""

    # 预装模型配置
    MODELS = {
        "qwen2-7b-ssd": {
            "name": "Qwen2.0-7B-SSD",
            "path": "C:/model/Qwen2.0-7B-SSD-8380-2.34",
            "params": "7B",
            "quantization": "QNN 2.34",
            "description": "推荐首选，对话/分析，速度快，中文支持好",
            "max_tokens": 2048,
            "recommended": True
        },
        "llama3.1-8b": {
            "name": "Llama3.1-8B",
            "path": "C:/model/llama3.1-8b-8380-qnn2.38",
            "params": "8B",
            "quantization": "QNN 2.38",
            "description": "对话生成，英文效果好，推理能力强",
            "max_tokens": 2048,
            "recommended": False
        },
        "llama3.2-3b": {
            "name": "Llama3.2-3B",
            "path": "C:/model/llama3.2-3b-8380-qnn2.37",
            "params": "3B",
            "quantization": "QNN 2.37",
            "description": "轻量级场景，响应最快，内存占用小",
            "max_tokens": 2048,
            "recommended": False
        }
    }

    # 默认使用的模型
    DEFAULT_MODEL = "qwen2-7b-ssd"

    # QNN 库路径
    QNN_LIBS_PATH = "C:/ai-engine-direct-helper/samples/qai_libs"

    # QNN 配置
    RUNTIME = Runtime.HTP  # Hexagon Tensor Processor (NPU)
    LOG_LEVEL = LogLevel.INFO
    PROFILING_LEVEL = ProfilingLevel.BASIC


class NPUModelLoader:
    """NPU 模型加载器（使用 QAI AppBuilder）"""

    def __init__(self, model_key: str = None):
        """
        初始化模型加载器

        Args:
            model_key: 模型键名，如 "qwen2-7b-ssd"
        """
        self.model_key = model_key or ModelConfig.DEFAULT_MODEL
        self.model_config = ModelConfig.MODELS.get(self.model_key)

        if not self.model_config:
            raise ValueError(f"未知模型: {self.model_key}，可用模型: {list(ModelConfig.MODELS.keys())}")

        self.model: Optional[Any] = None
        self.is_loaded = False
        self.is_configured = False

    def load(self) -> Any:
        """
        加载模型到 NPU

        Returns:
            模型实例
        """
        if self.is_loaded:
            logger.info(f"[OK] 模型已加载: {self.model_config['name']}")
            return self.model

        logger.info(f"正在加载模型: {self.model_config['name']}...")
        logger.info(f"模型路径: {self.model_config['path']}")

        # 验证模型路径存在
        model_path = Path(self.model_config['path'])
        if not model_path.exists():
            raise FileNotFoundError(
                f"模型路径不存在: {model_path}\n"
                f"请确认远程 AIPC 上模型文件已解压到 C:/model/ 目录"
            )

        # 检查 QAI AppBuilder 是否可用
        if not QAI_AVAILABLE:
            logger.warning("[WARNING] QAI AppBuilder 不可用，返回模拟模型")
            self.model = self._create_mock_model()
            self.is_loaded = True
            return self.model

        try:
            start_time = time.time()

            # 配置 QNN 环境（全局配置，只需一次）
            if not self.is_configured:
                from qai_appbuilder import QNNConfig
                qnn_libs_path = Path(ModelConfig.QNN_LIBS_PATH)
                if not qnn_libs_path.exists():
                    logger.warning(f"[WARNING] QNN 库路径不存在: {ModelConfig.QNN_LIBS_PATH}")
                    # 尝试使用空路径（QAI AppBuilder 可能有默认路径）
                    QNNConfig.Config('', ModelConfig.RUNTIME, ModelConfig.LOG_LEVEL, ModelConfig.PROFILING_LEVEL)
                else:
                    QNNConfig.Config(
                        str(qnn_libs_path),
                        ModelConfig.RUNTIME,
                        ModelConfig.LOG_LEVEL,
                        ModelConfig.PROFILING_LEVEL
                    )
                self.is_configured = True
                logger.info("[OK] QNN 环境配置完成")

            # 加载模型（继承 QNNContext 创建自定义类）
            class LLMModel(QNNContext):
                def generate_text(self, prompt: str, max_tokens: int = 512, temperature: float = 0.7):
                    """
                    执行文本生成推理

                    Args:
                        prompt: 输入提示词
                        max_tokens: 最大生成token数
                        temperature: 温度参数

                    Returns:
                        生成的文本
                    """
                    # TODO: 实现 LLM 推理逻辑
                    # 需要根据具体的 QNN 模型格式实现
                    return f"[Mock] Response to: {prompt[:50]}..."

            self.model = LLMModel(self.model_config['name'], str(model_path))

            load_time = time.time() - start_time

            logger.info(f"[OK] 模型加载成功")
            logger.info(f"  - 模型: {self.model_config['name']}")
            logger.info(f"  - 参数量: {self.model_config['params']}")
            logger.info(f"  - 量化版本: {self.model_config['quantization']}")
            logger.info(f"  - 加载时间: {load_time:.2f}s")
            logger.info(f"  - 运行设备: NPU (Hexagon)")

            self.is_loaded = True
            return self.model

        except Exception as e:
            logger.error(f"[ERROR] 模型加载失败: {e}")
            # 返回模拟模型继续测试
            logger.warning("[WARNING] 回退到模拟模式")
            self.model = self._create_mock_model()
            self.is_loaded = True
            return self.model

    def infer(self, prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
        """
        执行推理

        Args:
            prompt: 输入提示词
            max_new_tokens: 最大生成token数
            temperature: 温度参数

        Returns:
            生成的文本
        """
        if not self.is_loaded:
            self.load()

        try:
            start_time = time.time()

            # 执行推理
            if QAI_AVAILABLE and hasattr(self.model, 'generate_text'):
                result = self.model.generate_text(
                    prompt=prompt,
                    max_tokens=max_new_tokens,
                    temperature=temperature
                )
            elif QAI_AVAILABLE and hasattr(self.model, 'Inference'):
                # 如果是标准 QNNContext，尝试 Inference 方法
                # TODO: 实现正确的输入数据格式
                result = f"[Mock] Inference for: {prompt[:50]}..."
            else:
                # 模拟模式
                result = f"[Mock output] Response to: {prompt[:50]}..."

            inference_time = (time.time() - start_time) * 1000

            logger.info(f"[OK] 推理完成: {inference_time:.2f}ms")

            # 检查性能指标
            if inference_time > 500:
                logger.warning(f"[WARNING] 推理延迟超标: {inference_time:.2f}ms (目标 < 500ms)")

            return result

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            raise

    def get_performance_stats(self) -> Dict[str, Any]:
        """
        获取性能统计数据

        Returns:
            性能统计字典
        """
        return {
            "model_name": self.model_config['name'],
            "params": self.model_config['params'],
            "quantization": self.model_config['quantization'],
            "is_loaded": self.is_loaded,
            "device": "NPU (Hexagon)" if QAI_AVAILABLE else "Mock",
            "runtime": str(ModelConfig.RUNTIME),
            "log_level": str(ModelConfig.LOG_LEVEL)
        }

    def unload(self):
        """卸载模型释放资源"""
        if self.model and hasattr(self.model, 'release'):
            self.model.release()

        self.model = None
        self.is_loaded = False
        logger.info(f"[OK] 模型已卸载: {self.model_config['name']}")

    def _create_mock_model(self):
        """创建模拟模型（本地开发用）"""
        class MockModel:
            def generate_text(self, prompt: str, max_tokens: int = 512, temperature: float = 0.7):
                return f"[Mock output] Response to: {prompt[:50]}..."

        return MockModel()

    @staticmethod
    def list_available_models() -> Dict[str, Dict[str, Any]]:
        """
        列出所有可用模型

        Returns:
            模型配置字典
        """
        return ModelConfig.MODELS

    @staticmethod
    def get_recommended_model() -> str:
        """
        获取推荐模型键名

        Returns:
            推荐模型的键名
        """
        for key, config in ModelConfig.MODELS.items():
            if config.get("recommended"):
                return key
        return ModelConfig.DEFAULT_MODEL


# 全局模型实例（单例模式）
_global_model_loader: Optional[NPUModelLoader] = None


def get_model_loader(model_key: str = None) -> NPUModelLoader:
    """
    获取全局模型加载器实例（单例模式）

    Args:
        model_key: 模型键名

    Returns:
        模型加载器实例
    """
    global _global_model_loader

    if _global_model_loader is None:
        _global_model_loader = NPUModelLoader(model_key)

    return _global_model_loader


def load_model_if_needed(model_key: str = None) -> Any:
    """
    加载模型（如果尚未加载）

    Args:
        model_key: 模型键名

    Returns:
        模型实例
    """
    loader = get_model_loader(model_key)
    return loader.load()


# 使用示例
if __name__ == "__main__":
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("=" * 60)
    print("NPU 模型加载器测试")
    print("=" * 60)

    # 1. 列出所有可用模型
    print("\n可用模型:")
    for key, config in NPUModelLoader.list_available_models().items():
        print(f"  [{key}] {config['name']} ({config['params']})")
        print(f"      - {config['description']}")
        if config.get('recommended'):
            print(f"      - ⭐️ 推荐首选")

    # 2. 加载推荐模型
    print(f"\n正在加载推荐模型...")
    loader = NPUModelLoader()
    model = loader.load()

    # 3. 执行推理测试
    print("\n执行推理测试...")
    test_prompt = "请分析一下端侧AI的优势"
    result = loader.infer(test_prompt, max_new_tokens=100)
    print(f"输入: {test_prompt}")
    print(f"输出: {result[:100]}...")

    # 4. 查看性能统计
    print("\n性能统计:")
    stats = loader.get_performance_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
