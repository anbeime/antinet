"""
NPU推理核心模块
使用 GenieContext 处理大模型（7B+）

硬件平台: 骁龙® X Elite (X1E-84-100)
软件工具: QAI AppBuilder + QNN SDK v2.42 + GenieAPIService v2.1.0
Backend: QNN HTP (Hexagon Tensor Processor) - 直接调用Hexagon NPU
性能模式: BURST高性能模式

模型根目录: <项目根目录>/models/  (所有模型放此目录)
SDK路径:    <项目根目录>/QAIRT/<版本>/lib/aarch64-windows-msvc
"""
import time
import logging
import os
from pathlib import Path
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

# 获取项目根目录（自动检测，支持可移植性）
_PROJECT_ROOT = Path(__file__).parent.parent.absolute()

class NPUInferenceCore:
    """NPU推理核心类 - 使用 GenieContext"""

    # 模型根目录（所有模型统一放在这里）- 使用相对路径实现可移植性
    MODELS_BASE_DIR = str(_PROJECT_ROOT / "models")

    # 默认模型配置路径（已下载的 LLaMA 3.2 3B）
    DEFAULT_MODEL_CONFIG = os.path.join(
        MODELS_BASE_DIR,
        "llama3.2-3b-8380-qnn2.37", "config.json"
    )

    @classmethod
    def list_available_models(cls) -> list[dict]:
        """自动扫描 MODELS_BASE_DIR 下所有可用模型"""
        models = []
        if not os.path.exists(cls.MODELS_BASE_DIR):
            return models
        for item in os.listdir(cls.MODELS_BASE_DIR):
            model_dir = os.path.join(cls.MODELS_BASE_DIR, item)
            config_path = os.path.join(model_dir, "config.json")
            # 也检查二级目录（有些模型放在 models_2.37/xxx/ 下）
            if not os.path.isdir(model_dir):
                continue
            if not os.path.exists(config_path):
                # 可能是扁平结构：item 就是模型名
                sub_config = config_path
            else:
                sub_config = None
            # 扫描二级目录
            for sub in os.listdir(model_dir):
                sub_path = os.path.join(model_dir, sub)
                if os.path.isdir(sub_path):
                    sub_config_path = os.path.join(sub_path, "config.json")
                    if os.path.exists(sub_config_path):
                        size = sum(
                            os.path.getsize(os.path.join(sub_path, f))
                            for f in os.listdir(sub_path)
                            if f.endswith('.bin') and os.path.isfile(os.path.join(sub_path, f))
                        )
                        models.append({
                            "name": f"{item}/{sub}",
                            "path": sub_config_path,
                            "size_mb": round(size / 1024 / 1024, 1)
                        })
            if os.path.exists(config_path):
                size = sum(
                    os.path.getsize(os.path.join(model_dir, f))
                    for f in os.listdir(model_dir)
                    if f.endswith('.bin') and os.path.isfile(os.path.join(model_dir, f))
                )
                models.append({
                    "name": item,
                    "path": config_path,
                    "size_mb": round(size / 1024 / 1024, 1)
                })
        return models

    def __init__(self, model_config_path: Optional[str] = None, qai_libs_path: Optional[str] = None):
        """
        初始化NPU推理核心

        Args:
            model_config_path: 模型配置文件路径（config.json）
                              如不传，则使用 DEFAULT_MODEL_CONFIG
            qai_libs_path: QAI库路径，如不传则自动检测
        """
        self.model_config_path = model_config_path or self.DEFAULT_MODEL_CONFIG
        self.model: Optional[GenieContext] = None
        self.is_loaded = False

        # 自动检测 QAIRT 库路径（支持多版本）
        if qai_libs_path is None:
            qai_libs_path = self._find_qairt_path()
        self.qai_libs_path = qai_libs_path

        # QAIRT 库路径（包含 QnnSystem.dll 等核心库）
        qairt_libs_path = self._find_qairt_path()

        # 设置PATH环境变量
        path = os.getenv('PATH', '')
        if self.qai_libs_path not in path:
            path = self.qai_libs_path + ";" + path
            logger.info(f"[OK] 已添加 QAI库路径到PATH: {self.qai_libs_path}")
        if qairt_libs_path not in path and qairt_libs_path != self.qai_libs_path:
            path = qairt_libs_path + ";" + path
            logger.info(f"[OK] 已添加 QAIRT库路径到PATH: {qairt_libs_path}")
        os.environ['PATH'] = path

    @staticmethod
    def _find_qairt_path() -> str:
        """自动查找 QAIRT SDK 路径"""
        qairt_base = _PROJECT_ROOT / "QAIRT"
        if qairt_base.exists():
            # 按版本号降序查找，优先使用 arm64x-windows-msvc（ARM64EC，兼容性更好）
            for version_dir in sorted(qairt_base.iterdir(), reverse=True):
                if version_dir.is_dir():
                    lib_path = version_dir / "lib" / "arm64x-windows-msvc"
                    if lib_path.exists():
                        return str(lib_path)
                    # 备选：aarch64-windows-msvc（原生 ARM64）
                    lib_path = version_dir / "lib" / "aarch64-windows-msvc"
                    if lib_path.exists():
                        return str(lib_path)
        # 回退到默认路径
        return str(_PROJECT_ROOT / "QAIRT" / "2.45.40.260406" / "lib" / "arm64x-windows-msvc")

    def load_model(self):
        """加载模型到NPU"""
        try:
            start_time = time.time()

            # 验证配置文件存在
            if not os.path.exists(self.model_config_path):
                raise FileNotFoundError(f"模型配置文件不存在: {self.model_config_path}")

            # 验证 backend 配置
            logger.info(f"[INFO] 验证 NPU backend 配置...")
            import json
            with open(self.model_config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            backend_type = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('type', 'UNKNOWN')
            logger.info(f"[INFO] Backend Type: {backend_type}")
            if backend_type != 'QnnHtp':
                logger.warning(f"[WARNING] Backend 类型不是 QnnHtp，当前为: {backend_type}")
            else:
                logger.info(f"[OK] 确认使用 QnnHtp backend (NPU)")

            # 创建 GenieContext（只传入config路径）
            logger.info(f"[DEBUG] 正在创建 GenieContext，config_path={self.model_config_path}")
            self.model = GenieContext(self.model_config_path)
            logger.info(f"[OK] GenieContext 创建成功")

            # 启用BURST性能模式以优化延迟
            try:
                if PerfProfile is not None:
                    # 方法1: 使用 qai_hub_models 设置 BURST 模式
                    PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                    logger.info("[OK] 已启用BURST性能模式 (via qai_hub_models)")
                else:
                    # 方法2: 使用环境变量设置 BURST 模式
                    import os
                    perf_mode = os.environ.get('QNN_PERFORMANCE_MODE', '').upper()
                    if perf_mode != 'BURST':
                        os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
                        logger.info("[OK] 已设置 QNN_PERFORMANCE_MODE=BURST (via env var)")
                    else:
                        logger.info("[OK] QNN_PERFORMANCE_MODE=BURST 已设置")
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