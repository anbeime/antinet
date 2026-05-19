# backend/conf/__init__.py - 配置管理模块
"""
配置管理模块 - 参考 SiYuan kernel/conf/ 架构
集中管理所有配置，支持环境变量覆盖
"""

from .base import BaseConfig, Settings
from .ai import AIConfig, OpenAIConfig
from .npu import NPUConfig
from .database import DatabaseConfig
from .app import AppConfig

__all__ = [
    'BaseConfig',
    'Settings', 
    'AIConfig',
    'OpenAIConfig',
    'NPUConfig',
    'DatabaseConfig',
    'AppConfig',
    'get_settings',
]

# 全局配置实例（延迟加载）
_settings = None

def get_settings() -> Settings:
    """获取全局配置单例"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
