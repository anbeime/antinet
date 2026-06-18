"""
⚠️ 配置模块 — 向后兼容 shim

此文件已重构为 conf/ 包，保持此文件仅用于向后兼容。
新代码请直接: from conf.xxx import YYY
"""
import warnings
from pathlib import Path
from typing import Dict, Any
import sys

from conf import get_settings, Settings
from conf.model import ModelRegistryConfig
from conf.npu import NPUConfig
from conf.database import DatabaseConfig

# Suppress deprecation warning during migration period
# TODO: Remove this file when all imports are migrated to conf/

# 兼容 PyInstaller 的路径
def _get_backend_dir() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent.absolute()

def _get_project_root() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent.parent
    return Path(__file__).parent.parent.absolute()

BACKEND_DIR = _get_backend_dir()
PROJECT_ROOT = _get_project_root()

MODEL_BASE_DIRS = [
    PROJECT_ROOT / "services" / "models",
    PROJECT_ROOT / "models",
    Path("C:/models"),
]

# 模型注册表（委派到 conf.model）
_model_registry = ModelRegistryConfig()
MODEL_REGISTRY = _model_registry.MODEL_REGISTRY
DEFAULT_CHAT_MODEL = _model_registry.DEFAULT_CHAT_MODEL
DEFAULT_VISION_MODEL = _model_registry.DEFAULT_VISION_MODEL
DEFAULT_EMBEDDING_MODEL = _model_registry.DEFAULT_EMBEDDING_MODEL

# QNN SDK 路径
_npu_config = NPUConfig()
QNN_SDK_PATHS = _npu_config.QNN_SDK_PATHS

# 配置实例
settings = get_settings()

# 向后兼容: DB_PATH (旧 Settings 直接有此字段, 新 conf 中在 DatabaseConfig)
_db_config = DatabaseConfig()
object.__setattr__(settings, 'DB_PATH', _db_config.DB_PATH)
object.__setattr__(settings, 'DATA_DIR', _db_config.DATA_DIR)

# 向后兼容: QNN settings (旧 Settings 有 QNN_* 字段, 新 conf 中在 NPUConfig)
_npu_config = NPUConfig()
for attr in ['QNN_BACKEND', 'QNN_DEVICE', 'QNN_PERFORMANCE_MODE', 'QNN_LOG_LEVEL', 'QNN_SDK_VERSION']:
    if hasattr(_npu_config, attr):
        object.__setattr__(settings, attr, getattr(_npu_config, attr))

def find_model_path(model_key: str) -> str:
    return _model_registry.find_model_path(model_key)

def find_qnn_sdk_path(version: str) -> str:
    return _npu_config.get_sdk_path(version)

__all__ = [
    "Settings", "settings",
    "MODEL_REGISTRY", "QNN_SDK_PATHS",
    "find_model_path", "find_qnn_sdk_path",
    "BACKEND_DIR", "PROJECT_ROOT", "MODEL_BASE_DIRS",
]
