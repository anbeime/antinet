"""
NPU 模型加载器
使用AIPC预装的GenieContext进行NPU推理
"""
import os
import sys
import time
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

# 添加Genie路径
GENIE_PATH = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if GENIE_PATH not in sys.path:
    sys.path.append(GENIE_PATH)

try:
    from qai_appbuilder import GenieContext
    GENIE_CONTEXT_AVAILABLE = True
except ImportError as e:
    GENIE_CONTEXT_AVAILABLE = False
    print(f"[FATAL] GenieContext不可用: {e}")

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


class NPUModelLoader:
    """NPU 模型加载器（使用 GenieContext）"""

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
        self.npu_mode = True  # 我们假设在AIPC上运行，总是使用NPU模式

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
                f"请确认 AIPC 上模型文件已解压到 C:/model/ 目录"
            )

        # 检查 GenieContext 是否可用
        if not GENIE_CONTEXT_AVAILABLE:
            logger.error("[FATAL] GenieContext 不可用！无法使用NPU推理")
            raise RuntimeError("GenieContext 未安装，无法使用真实NPU推理。请确保 AIPC 预装环境已配置。")

        start_time = time.time()

        try:
            # 使用 config.json 路径创建 GenieContext
            config_path = str(model_path / "config.json")
            logger.info(f"[INFO] 创建 GenieContext: {config_path}")
            
            # 设置必要的环境变量
            lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
            if 'PATH' in os.environ:
                os.environ['PATH'] = lib_path + ";" + os.environ['PATH']
            else:
                os.environ['PATH'] = lib_path
            
            os.environ['QAI_LIBS_PATH'] = lib_path
            
            self.model = GenieContext(config_path)

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
            raise RuntimeError(f"NPU模型加载失败: {e}\n请检查：\n1. 模型文件是否存在 {model_path}\n2. QNN库路径是否正确 {lib_path}\n3. 是否在 AIPC 上运行")

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

            # 设置推理参数
            if hasattr(self.model, 'SetParams'):
                try:
                    self.model.SetParams(max_new_tokens, temperature, 40, 0.95)
                except Exception as param_error:
                    logger.debug(f"SetParams失败，使用默认参数: {param_error}")

            # 创建回调函数收集结果
            result_parts = []
            
            def callback(text):
                result_parts.append(text)
                logger.debug(f"生成内容: {text}")
                return True
            
            # 执行推理
            self.model.Query(prompt, callback)
            result = ''.join(result_parts)

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
            "device": "NPU (Hexagon)",
            "runtime": "HTP",
            "log_level": "INFO"
        }

    def unload(self):
        """卸载模型释放资源"""
        if self.model and hasattr(self.model, 'release'):
            self.model.release()

        self.model = None
        self.is_loaded = False
        logger.info(f"[OK] 模型已卸载: {self.model_config['name']}")

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
