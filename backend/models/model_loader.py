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
    from qai_appbuilder import QNNContext, GenieContext, Runtime, LogLevel, ProfilingLevel, PerfProfile
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
        self.npu_mode = False  # 标记是否使用NPU模式

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

            # 尝试HTP模式（NPU）
            try:
                logger.info("[INFO] 尝试HTP模式（NPU）...")
                QNNConfig.Config(
                    str(qnn_libs_path),
                    'Htp',  # Hexagon Tensor Processor
                    2, 0, ''
                )
                logger.info("[OK] QNN HTP配置成功")
                self.npu_mode = True
            except Exception as htp_error:
                logger.warning(f"[WARNING] HTP模式失败: {htp_error}")
                
                # 回退到CPU模式
                try:
                    logger.info("[INFO] 回退到CPU模式...")
                    QNNConfig.Config(
                        str(qnn_libs_path),
                        'Cpu',  # CPU fallback
                        2, 0, ''
                    )
                    logger.info("[OK] QNN CPU配置成功")
                    self.npu_mode = False
                except Exception as cpu_error:
                    logger.error(f"[ERROR] CPU模式也失败: {cpu_error}")
                    raise RuntimeError(f"所有QNN后端都不可用: HTP({htp_error}), CPU({cpu_error})")
            
            self.is_configured = True

            # 加载模型（使用 GenieContext，适用于7B+大模型）
            from qai_appbuilder import GenieContext
            
            # 设置PATH环境变量（必需）
            lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
            import os
            if lib_path not in os.getenv('PATH', ''):
                os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
            
            # 使用 config.json 路径创建 GenieContext
            config_path = str(model_path / "config.json")
            self.model = GenieContext(config_path)

            load_time = time.time() - start_time

            logger.info(f"[OK] 模型加载成功")
            logger.info(f"  - 模型: {self.model_config['name']}")
            logger.info(f"  - 参数量: {self.model_config['params']}")
            logger.info(f"  - 量化版本: {self.model_config['quantization']}")
            logger.info(f"  - 加载时间: {load_time:.2f}s")
            logger.info(f"  - 运行设备: {'NPU (Hexagon)' if self.npu_mode else 'CPU (回退模式)'}")

            self.is_loaded = True
            return self.model

        except Exception as e:
            logger.error(f"[ERROR] 模型加载失败: {e}")
            
            # 检查是否是DLL加载错误
            if "dlopen error #126" in str(e) or "Unable to load backend" in str(e):
                logger.error("[CRITICAL] DLL加载失败 - NPU环境配置问题")
                logger.error("[SOLUTION] 请按以下步骤解决:")
                logger.error("  1. 以管理员身份运行VS Code")
                logger.error("  2. 安装 Visual C++ Redistributable 2015-2022 x64")
                logger.error("  3. 下载: https://aka.ms/vs/17/release/vc_redist.x64.exe")
                logger.error("  4. 如果仍有问题，安装 Qualcomm AI Runtime SDK")
                logger.error("  5. 重启系统后重试")
                logger.error("")
                logger.error("[TEMPORARY WORKAROUND] 当前使用CPU推理模式")
                
                # 临时解决方案：尝试CPU模式
                try:
                    logger.info("[INFO] 尝试CPU模式...")
                    from qai_appbuilder import QNNConfig
                    qnn_libs_path = Path(ModelConfig.QNN_LIBS_PATH)
                    if qnn_libs_path.exists():
                        QNNConfig.Config(
                            str(qnn_libs_path),
                            'Cpu',  # 改为CPU模式
                            2, 0, ''
                        )
                        logger.info("[OK] CPU模式配置成功")
                        
                        # 重新尝试加载
                        self.model = GenieContext(config_path)
                        load_time = time.time() - start_time
                        logger.info(f"[OK] 模型加载成功 (CPU模式)")
                        logger.info(f"  - 模型: {self.model_config['name']}")
                        logger.info(f"  - 运行设备: CPU (临时替代)")
                        self.is_loaded = True
                        return self.model
                    else:
                        logger.error("[ERROR] CPU库路径不存在")
                except Exception as cpu_error:
                    logger.error(f"[ERROR] CPU模式也失败: {cpu_error}")
            
            # 如果所有方法都失败，记录详细错误但不抛出异常
            logger.error("[FALLBACK] 所有NPU/CPU模式都不可用")
            logger.error("[DEVELOPMENT] 继续运行以支持其他功能开发")
            logger.error(f"[DETAILS] 错误详情: {e}")
            
            # 创建轻量级模拟模型用于开发
            self.model = self._create_lightweight_mock()
            self.is_loaded = True
            return self.model

    def infer(self, prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
        """
        执行推理

        Args:
            prompt: 输入提示词
            max_new_tokens: 最大生成token数
            temperature: 温度参数（GenieContext暂不支持，通过API设置）

        Returns:
            生成的文本
        """
        if not self.is_loaded:
            self.load()

        try:
            start_time = time.time()

            # 执行推理 - GenieContext 使用 Query() 方法
            if QAI_AVAILABLE and hasattr(self.model, 'Query'):
                # 设置推理参数（如果支持）
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
            else:
                # 备用模式：使用传统方法
                if hasattr(self.model, 'generate_text'):
                    result = self.model.generate_text(prompt, max_new_tokens, temperature)
                else:
                    result = f"[UNAVAILABLE] NPU模型不可用: {prompt[:50]}..."

            inference_time = (time.time() - start_time) * 1000

            logger.info(f"[OK] 推理完成: {inference_time:.2f}ms")

            # 检查性能指标
            if inference_time > 500:
                logger.warning(f"[WARNING] 推理延迟超标: {inference_time:.2f}ms (目标 < 500ms)")

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

    def _create_lightweight_mock(self):
        """创建轻量级模拟模型（开发备用）"""
        class LightweightMock:
            def Query(self, prompt: str, callback):
                # 模拟异步推理
                import time
                time.sleep(0.1)  # 模拟推理延迟
                
                # 生成模拟响应
                response = f"[NPU UNAVAILABLE] 模拟响应: {prompt[:30]}..."
                
                # 调用回调函数
                if callback:
                    callback(response)
                
                return response
            
            def SetParams(self, max_tokens, temperature, top_k, top_p):
                # 模拟参数设置
                pass

        logger.warning("[WARNING] 使用轻量级模拟模型 - NPU功能不可用")
        return LightweightMock()

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
