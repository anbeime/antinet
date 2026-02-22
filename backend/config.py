# backend/config.py - 配置文件
# 知易智能知识管家 - 骁龙X Elite AIPC端侧AI应用
# ============================================================
# 硬件平台: 骁龙® X Elite (X1E-84-100)
# SDK版本: QNN SDK v2.37 / v2.38 / v2.42 (多版本支持)
# Backend: QNN HTP (Hexagon Tensor Processor) - 直接调用NPU
# 模型: 支持多个QNN版本的模型
# ============================================================

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Dict, Any

# 获取后端目录的绝对路径
BACKEND_DIR = Path(__file__).parent.absolute()

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
    MODEL_NAME: str = "qwen2.5-vl-3b"  # 默认模型
    MODEL_PATH: str = "C:/model/models_2.42/qwen2.5vl3b-8380-2.42"
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

# ============================================================
# 多模型注册表
# ============================================================
MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    # === 纯文本模型 ===
    "llama3.1-8b": {
        "path": "C:/model/models_2.38/llama3.1-8b-8380-qnn2.38",
        "qnn_version": "2.38",
        "type": "chat",
        "context_length": 8192,
        "description": "Llama 3.1 8B - 强大的聊天模型",
        "performance": "high",
        "recommended": True  # 默认推荐
    },
    "llama3.2-3b": {
        "path": "C:/model/models_2.37/llama3.2-3b-8380-qnn2.37",
        "qnn_version": "2.37",
        "type": "chat",
        "context_length": 8192,
        "description": "Llama 3.2 3B - 轻量级聊天模型，速度快",
        "performance": "fast"
    },
    "qwen2.0-7b": {
        "path": "C:/model/models_2.34/Qwen2.0-7B-SSD-8380-2.34",
        "qnn_version": "2.34",
        "type": "chat",
        "context_length": 8192,
        "description": "Qwen 2.0 7B - 中文优化模型",
        "performance": "medium"
    },

    # === 视觉模型 ===
    "qwen2.5-vl-3b": {
        "path": "C:/model/models_2.42/qwen2.5vl3b-8380-2.42",
        "qnn_version": "2.42",
        "type": "vision",
        "context_length": 8192,
        "description": "Qwen 2.5 VL 3B - 多模态视觉语言模型",
        "requires_py312": True,
        "requires_image": True
    },

    # === 嵌入模型 ===
    "bge-base-zh": {
        "path": "C:/model/models_2.38/bge-base-zh-v1.5-qnn-8380",
        "qnn_version": "2.38",
        "type": "embedding",
        "dimension": 768,
        "description": "BGE Base 中文 - 文本嵌入模型",
        "performance": "high"
    }
}

# QNN SDK 版本路径映射
QNN_SDK_PATHS: Dict[str, str] = {
    "2.34": "C:/Qualcomm/AIStack/QAIRT/2.34.0/lib/arm64x-windows-msvc",
    "2.37": "C:/Qualcomm/AIStack/QAIRT/2.37.0.250724/lib/arm64x-windows-msvc",
    "2.38": "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc",
    "2.42": "C:/Qualcomm/AIStack/QAIRT/2.42.0/lib/arm64x-windows-msvc"
}

# 默认模型配置
DEFAULT_CHAT_MODEL: str = "llama3.1-8b"  # 默认使用最强的文本模型
DEFAULT_VISION_MODEL: str = "qwen2.5-vl-3b"  # 视觉模型
DEFAULT_EMBEDDING_MODEL: str = "bge-base-zh"  # 嵌入模型

# 创建全局设置实例
settings = Settings()
