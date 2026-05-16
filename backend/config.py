# backend/config.py - 配置文件
# 知易智能知识管家 - 骁龙X Elite AIPC端侧AI应用
# ============================================================
# 硬件平台: 骁龙 X Elite (X1E-84-100)
# SDK版本: QNN SDK v2.37 / v2.42 (多版本支持)
# Backend: QNN HTP (Hexagon Tensor Processor) - 直接调用NPU
# 模型: 支持多个QNN版本的模型
# 模型目录: {PROJECT_ROOT}/models (自动下载脚本放置位置)
# ============================================================

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Dict, Any

# 获取后端目录的绝对路径
BACKEND_DIR = Path(__file__).parent.absolute()
# 获取项目根目录
PROJECT_ROOT = BACKEND_DIR.parent.absolute()

# 模型基础目录 - 支持多位置查找
MODEL_BASE_DIRS = [
    PROJECT_ROOT / "models",
]

class Settings(BaseSettings):
    """应用配置 - 骁龙X Elite AIPC端侧AI配置"""

    # 基础配置
    APP_NAME: str = "知易智能知识管家"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True

    # 服务配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 模型配置（兼容旧代码）
    MODEL_NAME: str = "llama3.2-3b"
    MODEL_PATH: str = str(PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37")
    AUTO_LOAD_MODEL: bool = False

    # QNN配置
    QNN_BACKEND: str = "HTP"
    QNN_DEVICE: str = "NPU"
    QNN_PERFORMANCE_MODE: str = "BURST"
    QNN_LOG_LEVEL: str = "DEBUG"

    # 数据配置
    DATA_DIR: Path = BACKEND_DIR / "data"
    DB_PATH: Path = BACKEND_DIR / "data" / "antinet.db"

    # 安全配置
    DATA_STAYS_LOCAL: bool = True
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
        "env_prefix": "ZHIYI_",
    }


MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "llama3.2-3b": {
        "path": str(PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37"),
        "qnn_version": "2.37",
        "type": "chat",
        "context_length": 8192,
        "description": "Llama 3.2 3B - 轻量级聊天模型",
        "performance": "fast",
        "recommended": True,
    },
    "qwen2.0-7b": {
        "path": str(PROJECT_ROOT / "models" / "Qwen2.0-7B-SSD-8380-2.34"),
        "qnn_version": "2.34",
        "type": "chat",
        "context_length": 8192,
        "description": "Qwen 2.0 7B - 中文优化模型",
        "performance": "medium",
    },
    "qwen2.5-vl-3b": {
        "path": str(PROJECT_ROOT / "models" / "qwen2.5vl3b-8380-2.42"),
        "qnn_version": "2.42",
        "type": "vision",
        "context_length": 8192,
        "description": "Qwen 2.5 VL 3B - 多模态视觉语言模型",
        "requires_py312": True,
        "requires_image": True,
    },
}


def find_model_path(model_key: str) -> str:
    """查找模型实际路径，支持多位置搜索"""
    if model_key not in MODEL_REGISTRY:
        return None

    model_config = MODEL_REGISTRY[model_key]
    primary_path = model_config.get("path")
    alt_paths = model_config.get("alt_paths", [])

    if Path(primary_path).exists():
        return primary_path

    for alt_path in alt_paths:
        if Path(alt_path).exists():
            return alt_path

    return primary_path


def _find_qnn_sdk_path(version: str) -> str:
    """查找指定版本的 QNN SDK DLL 路径"""
    version_dirs = {
        "2.34": ["2.34.0.250626", "2.45.40.260406", "2.42.0.251225"],
        "2.37": ["2.37.1.250807", "2.45.40.260406", "2.42.0.251225"],
        "2.42": ["2.42.0.251225", "2.45.40.260406"],
        "2.45": ["2.45.40.260406"],
    }
    for vdir in version_dirs.get(version, ["2.45.40.260406"]):
        p = PROJECT_ROOT / "QAIRT" / vdir / "lib" / "arm64x-windows-msvc"
        if p.exists():
            return str(p)
        p = PROJECT_ROOT / "QAIRT" / vdir / "lib" / "aarch64-windows-msvc"
        if p.exists():
            return str(p)
    return str(PROJECT_ROOT / "QAIRT" / "2.45.40.260406" / "lib" / "arm64x-windows-msvc")


QNN_SDK_PATHS: Dict[str, str] = {
    "2.34": _find_qnn_sdk_path("2.34"),
    "2.37": _find_qnn_sdk_path("2.37"),
    "2.42": _find_qnn_sdk_path("2.42"),
    "2.45": _find_qnn_sdk_path("2.45"),
}


def find_qnn_sdk_path(version: str) -> str:
    """查找 QNN SDK 实际路径"""
    if version in QNN_SDK_PATHS:
        sdk_path = QNN_SDK_PATHS[version]
        if Path(sdk_path).exists():
            return sdk_path

    default_path = str(PROJECT_ROOT / "QAIRT" / "2.45.40.260406" / "lib" / "arm64x-windows-msvc")
    if Path(default_path).exists():
        return default_path

    return default_path


DEFAULT_CHAT_MODEL: str = "llama3.2-3b"
DEFAULT_VISION_MODEL: str = "qwen2.5-vl-3b"
DEFAULT_EMBEDDING_MODEL: str = "nomic-embed-text-v2-moe"

__all__ = [
    "Settings",
    "settings",
    "MODEL_REGISTRY",
    "QNN_SDK_PATHS",
    "find_model_path",
    "find_qnn_sdk_path",
]

settings = Settings()