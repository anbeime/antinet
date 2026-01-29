# backend/config.py - 配置文件
# Antinet智能知识管家 - 骁龙X Elite AIPC端侧AI应用
# ============================================================
# 硬件平台: 骁龙® X Elite (X1E-84-100)
# SDK版本: QNN SDK v2.34 / v2.38 (兼容)
# Backend: QNN HTP (Hexagon Tensor Processor) - 直接调用NPU
# 模型: Qwen2.0-7B-SSD (INT8量化QNN格式)
# ============================================================

from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    """应用配置 - 骁龙X Elite AIPC端侧AI配置"""

    # 基础配置
    APP_NAME: str = "Antinet智能知识管家"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # 服务配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 模型配置（使用AIPC预装模型）
    # 模型名称: Qwen2.0-7B-SSD
    # 量化方式: QNN INT8量化
    # 模型格式: QNN binary (.bin)
    # 模型路径: C:\model\Qwen2.0-7B-SSD-8380-2.34\
    MODEL_NAME: str = "Qwen2.0-7B-SSD"
    MODEL_PATH: Path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
    AUTO_LOAD_MODEL: bool = True  # 启动时自动加载模型

    # QNN配置
    # Backend: HTP (Hexagon Tensor Processor) = NPU
    # 通过QNN HTP后端直接调用Hexagon NPU进行INT8量化模型推理
    QNN_BACKEND: str = "HTP"  # HTP = Hexagon Tensor Processor (NPU)
    QNN_DEVICE: str = "NPU"   # NPU | GPU | CPU
    QNN_PERFORMANCE_MODE: str = "BURST"  # BURST高性能模式 | DEFAULT | POWER_SAVER
    QNN_LOG_LEVEL: str = "DEBUG"  # DEBUG | TRACE | INFO | WARN | ERROR

    # 数据配置
    DATA_DIR: Path = Path("./data")
    DB_PATH: Path = Path("./data/antinet.db")

    # 安全配置
    DATA_STAYS_LOCAL: bool = True  # 数据不出域
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
