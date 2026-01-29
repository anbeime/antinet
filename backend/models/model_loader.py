"""
NPU 模型加载器
使用AIPC预装的GenieContext进行NPU推理

硬件平台: 骁龙® X Elite (X1E-84-100)
软件工具: QAI AppBuilder v2.31.0 + QNN SDK v2.38
Backend: QNN HTP (Hexagon Tensor Processor) - 直接调用Hexagon NPU
模型: Qwen2.0-7B-SSD (INT8量化QNN格式)
"""
import os
import sys
import time
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

# 强制禁用 qai_hub_models 依赖，防止因缺少该库导致崩溃
HAS_QAI_HUB = False

# 添加Genie路径
GENIE_PATH = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if GENIE_PATH not in sys.path:
    sys.path.append(GENIE_PATH)

# 初始化logger
logger = logging.getLogger(__name__)

# 设置必要的环境变量，确保导入 GenieContext 前 NPU 库路径在 PATH 中
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

# 确保两个目录都在 PATH 中（注意顺序，bridge_lib_path在前）
paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 添加DLL目录（Python 3.8+），按特定顺序添加
for p in paths_to_add:
    if os.path.exists(p):
        try:
            os.add_dll_directory(p)
            logger.info(f"[OK] 已添加DLL目录到加载路径: {p}")
        except Exception as e:
            logger.warning(f"[WARNING] 添加DLL目录失败 {p}: {e}")

# 设置 QNN 日志级别为 DEBUG 以启用详细日志输出
try:
    from backend.config import settings
    qnn_log_level = settings.QNN_LOG_LEVEL
    os.environ['QNN_LOG_LEVEL'] = qnn_log_level
    logger.info(f"[OK] QNN 日志级别设置为: {qnn_log_level}")
except ImportError:
    os.environ['QNN_LOG_LEVEL'] = "DEBUG"
    logger.info("[INFO] 使用默认 QNN 日志级别: DEBUG")

# 设置 QNN 其他环境变量以启用详细日志
os.environ['QNN_DEBUG'] = "1"
os.environ['QNN_VERBOSE'] = "1"
logger.info("[OK] QNN 调试标志已设置（QNN_DEBUG=1, QNN_VERBOSE=1）")

# 预加载QNN核心DLL，确保正确的加载顺序
logger.info("[INFO] 预加载QNN核心DLL...")
import ctypes
try:
    # 按顺序预加载DLL，避免版本冲突（改进版：先加载Genie.dll）
    dlls_to_load = [
        "Genie.dll",           # Genie核心库
        "QnnSystem.dll",       # QNN系统库
        "QnnModelDlc.dll",    # QNN模型库
        "QnnHtp.dll",         # NPU backend
        "QnnHtpPrepare.dll"   # NPU准备库
    ]

    for dll in dlls_to_load:
        found = False
        for p in paths_to_add:
            dll_path = Path(p) / dll
            if dll_path.exists():
                try:
                    # 使用windll而不是CDLL，因为有些DLL需要stdcall调用约定
                    ctypes.WinDLL(str(dll_path))
                    logger.info(f"[OK] 预加载成功: {dll}")
                    found = True
                    break
                except Exception as e:
                    logger.warning(f"[WARNING] 预加载失败 {dll}: {e}")
        if not found:
            logger.warning(f"[WARNING] 未找到DLL: {dll}")
    
    logger.info("[OK] DLL预加载完成")
except Exception as e:
    logger.warning(f"[WARNING] DLL预加载过程出错: {e}")

# qai_hub_models是可选的，仅用于性能配置（BURST模式）
PerfProfile = None
try:
    from qai_hub_models.models._shared.perf_profile import PerfProfile
    HAS_QAI_HUB = True
    logger.info("[OK] 已导入 qai_hub_models.PerfProfile，性能优化可用")
except ImportError:
    logger.warning("[INFO] qai_hub_models 未安装，将使用默认性能配置")

try:
    from qai_appbuilder import GenieContext
    logger.info("[OK] GenieContext导入成功")
except ImportError as e:
    raise RuntimeError(f"无法导入GenieContext: {e}。请确保已安装qai_appbuilder库。")





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

        max_retries = 3
        last_exception = None

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.warning(f"重试加载模型 (尝试 {attempt+1}/{max_retries})")
                    # 等待一小段时间再重试
                    time.sleep(2.0)

                # 使用 config.json 路径创建 GenieContext（官方示例：只传一个参数）
                config_path = str(model_path / "config.json")
                logger.info(f"[INFO] 创建 GenieContext: {config_path}")

                # 创建 GenieContext（参考官方 GenieSample.py，只传 config 参数）
                logger.info(f"[DEBUG] 正在创建 GenieContext，config_path={config_path}")
                logger.info(f"[DEBUG] PATH环境变量长度: {len(os.environ.get('PATH', ''))}")
                logger.info(f"[DEBUG] QNN_LOG_LEVEL: {os.environ.get('QNN_LOG_LEVEL', 'NOT SET')}")
                logger.info(f"[DEBUG] 使用单参数创建（参考官方 GenieSample.py）")

                # 尝试单参数创建（参考官方示例）
                self.model = GenieContext(config_path)
                logger.info(f"[OK] GenieContext 创建成功")

                # 验证 backend 配置
                logger.info(f"[INFO] 验证 NPU backend 配置...")
                import json
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                backend_type = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('type', 'UNKNOWN')
                logger.info(f"[INFO] Backend Type: {backend_type}")
                if backend_type != 'QnnHtp':
                    logger.warning(f"[WARNING] Backend 类型不是 QnnHtp，当前为: {backend_type}")
                else:
                    logger.info(f"[OK] 确认使用 QnnHtp backend (NPU)")

                # 启用BURST性能模式以优化延迟（如果qai_hub_models可用）
                try:
                    if PerfProfile is not None:
                        PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                        logger.info("[OK] 已启用BURST性能模式（qai_hub_models）")
                    else:
                        logger.info("[INFO] qai_hub_models未安装，尝试通过环境变量启用BURST模式")
                        # 尝试通过环境变量启用高性能模式
                        os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
                        os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'
                        logger.info("[OK] 已通过环境变量启用 BURST 性能模式")
                except Exception as e:
                    logger.warning(f"[WARNING] 启用BURST模式失败: {e}")
                    # 即使失败也尝试设置环境变量
                    try:
                        os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
                        os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'
                        logger.info("[OK] 已通过环境变量启用 BURST 性能模式（备用方案）")
                    except:
                        pass

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

                # 检查是否是设备创建错误（错误代码14001）
                error_msg = str(e)
                if "14001" in error_msg or "Failed to create device" in error_msg:
                    logger.error("[CRITICAL] NPU设备创建失败（错误代码14001）")
                    logger.error("可能原因:")
                    logger.error("  1. NPU驱动未正确安装")
                    logger.error("  2. 另一个进程已占用NPU资源")
                    logger.error("  3. DLL版本不匹配")
                    logger.error("  4. 系统权限不足")
                    logger.error("建议:")
                    logger.error("  - 重启AIPC")
                    logger.error("  - 检查是否有其他NPU相关进程运行")
                    logger.error("  - 查看Windows事件查看器中的错误日志")

                # 如果是最后一次尝试，则抛出异常
                if attempt == max_retries - 1:
                    raise RuntimeError(
                        f"NPU模型加载失败，重试 {max_retries} 次后仍失败: {e}\n"
                        f"请检查NPU驱动和DLL路径配置。"
                    )
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

    def infer(self, prompt: str, max_new_tokens: int = 64, temperature: float = 0.7) -> str:
        """
        执行推理

        Args:
            prompt: 输入提示词
            max_new_tokens: 最大生成token数（默认64以优化性能）
            temperature: 温度参数

        Returns:
            生成的文本

        Raises:
            Exception: 如果推理过程发生错误
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

            #  熔断检查：如果推理时间超过 2000ms，可能未走 NPU
            # NPU 推理应该在 450ms 左右，但复杂推理可能需要更长时间
            # 调整阈值到 2000ms 以避免误报
            if inference_time > 2000:
                warning_msg = (
                    f"[性能警告] 推理延迟 {inference_time:.2f}ms 超过 2000ms 建议阈值\n"
                    f"可能原因：\n"
                    f"  1. 未正确配置 NPU execution provider\n"
                    f"  2. 模型加载在 CPU 上而非 NPU\n"
                    f"  3. 没有使用 QNN HTP backend\n"
                    f"  4. 内存未分配到 NPU 上\n"
                    f"  5. 推理提示词过长或生成 token 数过多\n"
                    f"\n"
                    f"建议检查：\n"
                    f"  - config.json 中的 'backend.type' 是否为 'QnnHtp'\n"
                    f"  - 确认 'allocated on NPU' 和 'execution provider: NPU'\n"
                    f"  - 检查 QNN 日志输出以确认执行 provider\n"
                    f"  - 尝试减少 max_new_tokens 或缩短提示词"
                )
                logger.warning(warning_msg)
            else:
                logger.info(f"[性能检查通过] 推理时间 {inference_time:.2f}ms 在正常范围内 (< 1000ms)")
                if inference_time > 500:
                    logger.warning(f"[WARNING] 推理时间 {inference_time:.2f}ms 略高，建议检查提示词长度和 token 数")

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
