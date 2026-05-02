# backend/conf/base.py - 基础配置类
"""
基础配置类 - 参考 SiYuan kernel/conf/ 模式
支持环境变量覆盖机制
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class BaseConfig(BaseModel):
    """基础配置类，提供通用配置功能"""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略额外的环境变量
        env_prefix = ""  # 子类可以设置自己的前缀


class Settings(BaseConfig):
    """应用全局配置"""
    
    # 基础配置
    APP_NAME: str = "知易智能知识管家"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # 服务配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 安全配置
    DATA_STAYS_LOCAL: bool = True
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # 路径配置
    BACKEND_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.absolute())
    PROJECT_ROOT: Path = Field(default_factory=lambda: Path(__file__).parent.parent.absolute())
    
    class Config:
        env_prefix = "ZHIYI_"
        env_file = ".env"


# 全局配置实例
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """获取全局配置单例"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """重新加载配置"""
    global _settings
    _settings = Settings()
    return _settings