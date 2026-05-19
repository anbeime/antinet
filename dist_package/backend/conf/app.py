# backend/conf/app.py - 应用配置
"""
应用配置 - 参考 SiYuan 配置管理模式
集中管理应用级别的配置
"""

from typing import List, Optional
from pydantic import Field
from .base import BaseConfig


class AppConfig(BaseConfig):
    """应用配置"""
    
    # 应用信息
    APP_NAME: str = Field(default="知易智能知识管家")
    APP_VERSION: str = Field(default="2.0.0")
    APP_DESCRIPTION: str = Field(default="端侧智能数据中枢与协同分析平台")
    
    # 服务器配置
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    DEBUG: bool = Field(default=True)
    
    # CORS 配置
    CORS_ORIGINS: List[str] = Field(default=["*"], description="允许的源")
    CORS_METHODS: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        description="允许的方法"
    )
    CORS_HEADERS: List[str] = Field(
        default=["*"],
        description="允许的头部"
    )
    
    # 安全配置
    DATA_STAYS_LOCAL: bool = Field(default=True, description="数据不出域")
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, description="最大上传大小")
    
    # 中间件配置
    ENABLE_GZIP: bool = Field(default=True, description="启用GZIP压缩")
    GZIP_MINIMUM_SIZE: int = Field(default=1000, description="GZIP压缩最小字节数")
    ENABLE_REQUEST_LOGGING: bool = Field(default=True, description="启用请求日志")
    ENABLE_CONCURRENCY_CONTROL: bool = Field(default=True, description="启用并发控制")
    
    class Config:
        env_prefix = "ZHIYI_APP_"
    
    def get_cors_origins(self) -> List[str]:
        """获取 CORS 允许的源"""
        return self.CORS_ORIGINS
    
    def is_debug(self) -> bool:
        """是否调试模式"""
        return self.DEBUG
