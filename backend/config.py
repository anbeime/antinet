# backend/config.py - 配置文件
# 知易智能知识管家 - 骁龙X Elite AIPC端侧AI应用
# ============================================================
# 硬件平台: 骁龙® X Elite (X1E-84-100)
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
    PROJECT_ROOT / "models",           # 当前项目位置（所有模型都在这）
]

class Settings(BaseSettings):
    """应用配置 - 骁龙X Elite AIPC端侧AI配置"""

    # 基础配置
    APP_NAME: str = "知易智能知识管家"
    APP_VERSION: str = "2.0.0"  # 升级到2.0支持多模型
    DEBUG: bool = True

    # 服务配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 模型配置（兼容旧代码）
    MODEL_NAME: str = "llama3.2-3b"  # 默认模型（轻量快速）
    MODEL_PATH: str = str(PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37")
    AUTO_LOAD_MODEL: bool = False  # 禁用启动时预加载，避免阻塞服务启动

    # QNN配置
    # Backend: HTP (Hexagon Tensor Processor) = NPU
    # 通过QNN HTP后端直接调用Hexagon NPU进行INT8量化模型推理
    QNN_BACKEND: str = "HTP"  # HTP = Hexagon Tensor Processor (NPU)
    QNN_DEVICE: str = "NPU"   # NPU | GPU | CPU
    QNN_PERFORMANCE_MODE: str = "BURST"  # BURST高性能模式 | DEFAULT | POWER_SAVER
    QNN_LOG_LEVEL: str = "DEBUG"  # DEBUG | TRACE | INFO | WARN | ERROR

    # 数据配置 - 使用绝对路径确保一致性
    DATA_DIR: Path = BACKEND_DIR / "data"
    DB_PATH: Path = BACKEND_DIR / "data" / "antinet.db"

    # 安全配置
    DATA_STAYS_LOCAL: bool = True  # 数据不出域
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略额外的环境变量（如QAI_LIBS_PATH等）
        # 防止系统环境变量 DEBUG=release 导致 pydantic bool 解析失败
        # 使用 ZHIYI_ 前缀来避免与系统环境变量冲突
        env_prefix = "ZHIYI_"

# ============================================================
# 多模型注册表
# ============================================================
MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    # === 纯文本模型（已移除 llama3.1-8b，NPU加载失败）===
    "llama3.2-3b": {
        "path": str(PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37"),
        "qnn_version": "2.37",
        "type": "chat",
        "context_length": 8192,
        "description": "Llama 3.2 3B - 轻量级聊天模型，速度快",
        "performance": "fast",
        "recommended": True
    },
    "qwen2.0-7b": {
        "path": str(PROJECT_ROOT / "models" / "Qwen2.0-7B-SSD-8380-2.34"),
        "qnn_version": "2.34",
        "type": "chat",
        "context_length": 8192,
        "description": "Qwen 2.0 7B - 中文优化模型",
        "performance": "medium"
    },

    # === 视觉模型 ===
    "qwen2.5-vl-3b": {
        "path": str(PROJECT_ROOT / "models" / "qwen2.5vl3b-8380-2.42"),
        "qnn_version": "2.42",
        "type": "vision",
        "context_length": 8192,
        "description": "Qwen 2.5 VL 3B - 多模态视觉语言模型",
        "requires_py312": True,
        "requires_image": True
    },

    # === Ollama 远程模型 ===
    "gemma4": {
        "path": "",  # Ollama 不需要本地路径
        "type": "ollama",
        "ollama_model": "gemma4:latest",
        "ollama_url": "http://localhost:11434",
        "context_length": 131072,
        "description": "Gemma 4 8B (Ollama) - 高质量大模型，适合复杂任务和技能调用",
        "performance": "slow",
        "recommended": False
    },

    # === 嵌入模型 ===
    "bge-base-zh": {
        "path": str(PROJECT_ROOT / "models" / "bge-base-zh-v1.5-qnn-8380"),
        "qnn_version": "2.38",
        "type": "embedding",
        "dimension": 768,
        "description": "BGE Base 中文 - 文本嵌入模型",
        "performance": "high"
    }
}


def find_model_path(model_key: str) -> str:
    """查找模型实际路径，支持多位置搜索"""
    if model_key not in MODEL_REGISTRY:
        return None

    model_config = MODEL_REGISTRY[model_key]
    primary_path = model_config.get("path")
    alt_paths = model_config.get("alt_paths", [])

    # 检查主路径
    if Path(primary_path).exists():
        return primary_path

    # 检查备用路径
    for alt_path in alt_paths:
        if Path(alt_path).exists():
            return alt_path

    # 返回主路径（即使不存在）
    return primary_path

# QNN SDK 版本路径映射 - 每个版本按优先级查找
# 注意：QAIRT 2.45 SDK 向下兼容 v73 模型，精确版本优先，新版本 fallback
def _find_qnn_sdk_path(version: str) -> str:
    """查找指定版本的 QNN SDK DLL 路径"""
    # 版本号到目录名的映射（优先精确版本，然后 fallback 到兼容的新版本）
    version_dirs = {
        "2.34": ["2.34.0.250626", "2.45.40.260406", "2.42.0.251225"],
        "2.37": ["2.37.1.250807", "2.45.40.260406", "2.42.0.251225"],
        "2.42": ["2.42.0.251225", "2.45.40.260406"],
        "2.45": ["2.45.40.260406"],
    }
    for vdir in version_dirs.get(version, ["2.45.40.260406"]):
        # 优先 arm64x-windows-msvc（ARM64EC，与原始版本一致，兼容性更好）
        p = PROJECT_ROOT / "QAIRT" / vdir / "lib" / "arm64x-windows-msvc"
        if p.exists():
            return str(p)
        # 备选 aarch64-windows-msvc（原生 ARM64）
        p = PROJECT_ROOT / "QAIRT" / vdir / "lib" / "aarch64-windows-msvc"
        if p.exists():
            return str(p)
    # fallback 到 2.45 arm64x
    return str(PROJECT_ROOT / "QAIRT" / "2.45.40.260406" / "lib" / "arm64x-windows-msvc")

QNN_SDK_PATHS: Dict[str, str] = {
    "2.34": _find_qnn_sdk_path("2.34"),
    "2.37": _find_qnn_sdk_path("2.37"),
    "2.42": _find_qnn_sdk_path("2.42"),
    "2.45": _find_qnn_sdk_path("2.45"),
}


def find_qnn_sdk_path(version: str) -> str:
    """查找 QNN SDK 实际路径"""
    # 首先尝试精确版本
    if version in QNN_SDK_PATHS:
        sdk_path = QNN_SDK_PATHS[version]
        if Path(sdk_path).exists():
            return sdk_path

    # 默认返回 v2.45 路径（优先 arm64x）
    default_path = str(PROJECT_ROOT / "QAIRT" / "2.45.40.260406" / "lib" / "arm64x-windows-msvc")
    if Path(default_path).exists():
        return default_path

    return default_path

# 默认模型配置
DEFAULT_CHAT_MODEL: str = "llama3.2-3b"  # 默认使用轻量快速的3B模型
DEFAULT_VISION_MODEL: str = "qwen2.5-vl-3b"  # 视觉模型
DEFAULT_EMBEDDING_MODEL: str = "bge-base-zh"  # 嵌入模型

# 导出路径查找函数
__all__ = ['Settings', 'settings', 'MODEL_REGISTRY', 'QNN_SDK_PATHS',
           'find_model_path', 'find_qnn_sdk_path']

# 创建全局设置实例
settings = Settings()
