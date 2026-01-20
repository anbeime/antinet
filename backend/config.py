# backend/config.py - 配置文件
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    """应用配置"""

    # 基础配置
    APP_NAME: str = "Antinet智能知识管家"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # 服务配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 模型配置（使用 AIPC 预装模型）
    MODEL_NAME: str = "Qwen2.0-7B-SSD"
    MODEL_PATH: Path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")

    # QNN配置
    QNN_BACKEND: str = "HTP"  # HTP (Hexagon Tensor Processor) = NPU
    QNN_DEVICE: str = "NPU"   # NPU | GPU | CPU
    QNN_PERFORMANCE_MODE: str = "BURST"  # BURST | DEFAULT | POWER_SAVER

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
