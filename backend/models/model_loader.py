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

# 设置必要的环境变量，确保导入 GenieContext 前 NPU 库路径在 PATH 中
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

# 确保两个目录都在 PATH 中
paths_to_add = [lib_path, bridge_lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 显式添加 DLL 目录（Python 3.8+）
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

try:
    from qai_appbuilder import GenieContext
    from qai_hub_models.models._shared.perf_profile import PerfProfile
except ImportError as e:
    raise RuntimeError(f"无法导入GenieContext: {e}。请确保已安装qai_appbuilder库。")

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

    def load(self) -> Any:
        """
        加载模型到 NPU

        Returns:
            模型实例（真实 NPU）
        """
        logger.info(f"[DEBUG load] self.is_loaded={self.is_loaded}, self.model={self.model is not None}")
        if self.is_loaded:
            logger.info(f"[OK] 模型已加载: {self.model_config['name']}")
            return self.model

        # 安全检查：如果模型实例已存在，直接返回并设置 is_loaded
        if self.model is not None:
            logger.warning(f"模型实例存在但 is_loaded=False，修正状态")
            self.is_loaded = True
            logger.info(f"[DEBUG load] 修正后 self.is_loaded={self.is_loaded}")
            return self.model

        logger.info(f"正在加载模型: {self.model_config['name']}...")
        logger.info(f"模型路径: {self.model_config['path']}")

        # 验证模型路径存在
        model_path = Path(self.model_config['path'])
        if not model_path.exists():
            raise FileNotFoundError(f"模型路径不存在: {model_path}，请确保模型文件已部署到AIPC")

        start_time = time.time()

        max_retries = 2
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.warning(f"重试加载模型 (尝试 {attempt+1}/{max_retries})")
                    # 等待一小段时间再重试
                    time.sleep(1.0)
                
                # 使用 config.json 路径创建 GenieContext（官方示例：只传一个参数）
                config_path = str(model_path / "config.json")
                logger.info(f"[INFO] 创建 GenieContext: {config_path}")

                # 创建 GenieContext（参考官方GenieSample.py，只传config_path）
                self.model = GenieContext(config_path)

                # 启用BURST性能模式以优化延迟
                try:
                    PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                    logger.info("[OK] 已启用BURST性能模式")
                except Exception as e:
                    logger.warning(f"[WARNING] 启用BURST模式失败: {e}")

                load_time = time.time() - start_time

                logger.info(f"[OK] NPU 模型加载成功")
                logger.info(f"  - 模型: {self.model_config['name']}")
                logger.info(f"  - 参数量: {self.model_config['params']}")
                logger.info(f"  - 量化版本: {self.model_config['quantization']}")
                logger.info(f"  - 加载时间: {load_time:.2f}s")
                logger.info(f"  - 运行设备: NPU (Hexagon)")

                self.is_loaded = True
                logger.info(f"[DEBUG load] 成功加载后 self.is_loaded={self.is_loaded}")
                return self.model

            except Exception as e:
                last_exception = e
                logger.error(f"[ERROR] NPU 模型加载失败 (尝试 {attempt+1}/{max_retries}): {e}")
                import traceback
                logger.error(f"详细堆栈:\n{traceback.format_exc()}")
                # 如果是最后一次尝试，则抛出异常
                if attempt == max_retries - 1:
                    raise RuntimeError(f"NPU模型加载失败，重试 {max_retries} 次后仍失败: {e}")
                # 否则继续重试
        
        # 不应到达此处
        raise RuntimeError(f"NPU模型加载失败，未知错误: {last_exception}")

    def _format_prompt(self, user_input: str) -> str:
        """
        格式化用户输入为模型期望的提示格式
        
        根据prompt.conf文件格式：
        prompt_tags_1: <|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n
        prompt_tags_2: <|im_end|>\n<|im_start|>assistant\n
        
        Args:
            user_input: 用户输入文本
            
        Returns:
            格式化后的完整提示
        """
        # 硬编码的提示格式（从prompt.conf解析）
        prompt_tags_1 = "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n"
        prompt_tags_2 = "<|im_end|>\n<|im_start|>assistant\n"
        
        # 构建完整提示
        formatted_prompt = prompt_tags_1 + user_input + prompt_tags_2
        logger.debug(f"提示格式化: 用户输入={repr(user_input)}, 格式化后长度={len(formatted_prompt)}")
        
        return formatted_prompt

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
        # 安全检查：如果模型实例已存在但 is_loaded=False，修正状态
        if self.model is not None and not self.is_loaded:
            logger.warning(f"模型实例存在但 is_loaded=False，在 infer() 中修正状态")
            self.is_loaded = True
        
        if not self.is_loaded:
            self.load()

        try:
            start_time = time.time()

            # 格式化提示词为模型期望的格式
            formatted_prompt = self._format_prompt(prompt)
            logger.debug(f"推理提示词: {repr(prompt[:100])}... -> 格式化后长度: {len(formatted_prompt)}")
            
            # 设置推理参数
            if hasattr(self.model, 'SetParams'):
                try:
                    # SetParams需要字符串参数
                    max_tokens_str = str(max_new_tokens)
                    temp_str = str(temperature)
                    top_k_str = str(40)  # top_k参数
                    top_p_str = str(0.95)  # top_p参数
                    logger.debug(f"设置推理参数: max_tokens={max_tokens_str}, temperature={temp_str}")
                    success = self.model.SetParams(max_tokens_str, temp_str, top_k_str, top_p_str)
                    logger.debug(f"SetParams返回: {success}")
                except Exception as param_error:
                    logger.warning(f"SetParams失败，使用默认参数: {param_error}")

            # 创建回调函数收集结果
            result_parts = []
            callback_count = 0
            
            def callback(text):
                nonlocal callback_count
                callback_count += 1
                result_parts.append(text)
                # 只记录前几次回调，避免日志过多
                if callback_count <= 5:
                    logger.debug(f"回调 #{callback_count}: {repr(text[:50])}...")
                return True
            
            # 执行推理
            logger.debug(f"开始NPU推理...")
            self.model.Query(formatted_prompt, callback)
            logger.debug(f"推理完成，回调总次数: {callback_count}")
            result = ''.join(result_parts)
            logger.debug(f"总结果长度: {len(result)}")

            inference_time = (time.time() - start_time) * 1000

            logger.info(f"[OK] 推理完成: {inference_time:.2f}ms")

            # 检查性能指标
            if inference_time > 500:
                logger.warning(f"[WARNING] 推理延迟超标: {inference_time:.2f}ms (目标 < 500ms)")

            return result

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            import traceback
            logger.error(f"详细堆栈:\n{traceback.format_exc()}")
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

logger.info(f"[MODULE INIT] _global_model_loader initialized to: {_global_model_loader}")


def get_model_loader(model_key: str = None) -> NPUModelLoader:
    """
    获取全局模型加载器实例（单例模式）

    Args:
        model_key: 模型键名

    Returns:
        模型加载器实例
    """
    global _global_model_loader
    
    logger.info(f"[get_model_loader] _global_model_loader before: {_global_model_loader}")

    if _global_model_loader is None:
        logger.info(f"[get_model_loader] Creating new NPUModelLoader with key: {model_key}")
        _global_model_loader = NPUModelLoader(model_key)
        logger.info(f"[get_model_loader] Created: {_global_model_loader}")
    else:
        logger.info(f"[get_model_loader] Returning existing: {_global_model_loader}")

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
            print(f"      - * 推荐首选")

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
