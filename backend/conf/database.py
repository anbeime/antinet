# backend/conf/database.py - 数据库配置
"""
数据库配置 - 参考 SiYuan 配置管理模式
集中管理数据库连接和路径配置
"""

import sys
from pathlib import Path
from typing import Optional
from pydantic import Field
from .base import BaseConfig, get_settings


def _get_backend_dir() -> Path:
    """获取后端根目录（兼容 PyInstaller 打包）"""
    if getattr(sys, 'frozen', False):
        # exe 已在 backend/ 目录下，直接用 exe 所在目录
        return Path(sys.executable).parent
    return Path(__file__).parent.parent


_BACKEND_DIR = _get_backend_dir()


class DatabaseConfig(BaseConfig):
    """数据库配置"""
    
    # 数据库路径
    DB_PATH: Path = Field(default_factory=lambda: _BACKEND_DIR / "data" / "antinet.db")
    DB_VECTOR_PATH: Path = Field(default_factory=lambda: _BACKEND_DIR / "data" / "vector.db")
    
    # 数据目录
    DATA_DIR: Path = Field(default_factory=lambda: _BACKEND_DIR / "data")
    
    # 连接池配置
    DB_POOL_SIZE: int = Field(default=5, description="连接池大小")
    DB_MAX_OVERFLOW: int = Field(default=10, description="最大溢出连接数")
    DB_POOL_TIMEOUT: int = Field(default=30, description="连接超时(秒)")
    DB_POOL_RECYCLE: int = Field(default=3600, description="连接回收时间(秒)")
    
    class Config:
        env_prefix = "ZHIYI_DB_"
    
    def __init__(self, **data):
        super().__init__(**data)
        self._ensure_data_dir()
    
    def _ensure_data_dir(self):
        """确保数据目录存在"""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    @property
    def db_path_str(self) -> str:
        """获取数据库路径字符串"""
        return str(self.DB_PATH)
    
    @property
    def db_url(self) -> str:
        """获取数据库连接 URL（SQLite）"""
        return f"sqlite:///{self.DB_PATH}"