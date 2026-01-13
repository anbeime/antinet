"""
NPU 模型加载器
支持加载远程 AIPC 预装的 QNN 模型
"""
import os
import time
import logging
from typing import Optional, Dict, Any
from pathlib import Path

# 注意：qai_appbuilder 仅在 AIPC 上可用
try:
    from qai_appbuilder import QNNContext, QNNConfig
    QAI_AVAILABLE = True
except ImportError:
    QAI_AVAILABLE = False
    print("⚠️  QAI AppBuilder 未安装，模拟模式运行")

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

    # QNN 配置
    QNN_CONFIG = {
        "backend": "HTP",  # Hexagon Tensor Processor (NPU)
        "log_level": "INFO",
        "performance_mode": "BURST",  # BURST | DEFAULT | POWER_SAVER
    }


class NPUModelLoader:
    """NPU 模型加载器（使用 GenieAPIService）"""

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

        self.service_url = "http://127.0.0.1:8910/v1"
        self.is_service_running = False

        # 检查服务是否运行
        self.is_service_running = self._check_service()

        if not self.is_service_running and QAI_AVAILABLE:
            logger.warning("GenieAPIService 未运行，尝试启动...")
            self._start_service()

    def _check_service(self) -> bool:
        """检查 GenieAPIService 是否运行"""
        try:
            import requests
            response = requests.get(f"{self.service_url}/models", timeout=2)
            return response.status_code == 200
        except:
            return False

    def _start_service(self):
        """启动 GenieAPIService"""
        # 当前版本没有 GenieAPIService.exe
        # 使用模拟模式继续测试
        logger.warning("GenieAPIService.exe 不可用，使用模拟模式")
        return False

    def load(self) -> Any:
        """
        加载模型（检查服务状态）

        Returns:
            客户端实例
        """
        if not self.is_service_running and not self._check_service():
            self._start_service()

        if self.is_service_running:
            logger.info(f"[OK] GenieAPIService 正在运行: {self.model_config['name']}")
            logger.info(f"  - 模型: {self.model_config['name']}")
            logger.info(f"  - 参数量: {self.model_config['params']}")
            logger.info(f"  - 运行设备: NPU (通过 GenieAPIService)")

            return self._create_client()

        logger.warning("GenieAPIService 不可用，返回模拟模型")
        return self._create_mock_model()

    def _create_client(self) -> Any:
        """创建 OpenAI 客户端"""
        try:
            from openai import OpenAI
            return OpenAI(base_url=self.service_url, api_key="123")
        except ImportError:
            logger.error("openai 未安装: pip install openai")
            return self._create_mock_model()

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
        if not self.is_service_running:
            # 返回模拟输出
            return f"[Mock output] Response to '{prompt[:50]}...'"

        try:
            from openai import OpenAI
            import time

            client = OpenAI(base_url=self.service_url, api_key="123")

            start_time = time.time()

            response = client.chat.completions.create(
                model=self.model_config['name'],
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_new_tokens,
                temperature=temperature,
                extra_body={
                    "size": max_new_tokens,
                    "temp": temperature
                }
            )

            inference_time = (time.time() - start_time) * 1000

            result = response.choices[0].message.content

            logger.info(f"[OK] NPU推理完成: {inference_time:.2f}ms")

            # 检查性能指标
            if inference_time > 500:
                logger.warning(f"[WARNING] 推理延迟超标: {inference_time:.2f}ms (目标 < 500ms)")

            return result

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            raise

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
        if not self.is_service_running:
            # 返回模拟输出
            return f"[Mock output] Response to '{prompt[:50]}...'"

        try:
            from openai import OpenAI
            import time

            client = OpenAI(base_url=self.service_url, api_key="123")

            start_time = time.time()

            response = client.chat.completions.create(
                model=self.model_config['name'],
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_new_tokens,
                temperature=temperature,
                extra_body={
                    "size": max_new_tokens,
                    "temp": temperature
                }
            )

            inference_time = (time.time() - start_time) * 1000

            result = response.choices[0].message.content

            logger.info(f"[OK] NPU推理完成: {inference_time:.2f}ms")

            # 检查性能指标
            if inference_time > 500:
                logger.warning(f"[WARNING] 推理延迟超标: {inference_time:.2f}ms (目标 < 500ms)")

            return result

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            raise

            inference_time = (time.time() - start_time) * 1000

            logger.info(f"✓ NPU推理完成: {inference_time:.2f}ms")

            # 检查性能指标
            if inference_time > 500:
                logger.warning(f"⚠️  推理延迟超标: {inference_time:.2f}ms (目标 < 500ms)")

            return result

        except Exception as e:
            logger.error(f"❌ 推理失败: {e}")
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
            "is_loaded": self.is_service_running,
            "device": "NPU (GenieAPIService)" if self.is_service_running else "Mock",
            "service_url": self.service_url
        }

    def unload(self):
        """卸载模型（不关闭服务，服务可被其他进程使用）"""
        logger.info(f"[OK] 模型实例已释放: {self.model_config['name']}")
        # 不关闭服务，因为可能被其他进程使用

    def _create_mock_model(self):
        """创建模拟模型（本地开发用）"""
        class MockModel:
            def __init__(self):
                self.client = None

            def generate(self, prompt: str, **kwargs):
                return f"[模拟输出] 这是对 '{prompt[:30]}...' 的回复"

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
