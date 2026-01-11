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

    # 模型配置
    MODEL_NAME: str = "qwen2-1.5b"
    MODEL_PATH: Path = Path("./models/qwen2-1.5b-npu.bin")
    USE_NPU: bool = True  # 是否使用NPU加速

    # QNN配置
    QNN_BACKEND: str = "QNN"  # QNN | CPU
    QNN_DEVICE: str = "NPU"   # NPU | GPU | CPU

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
