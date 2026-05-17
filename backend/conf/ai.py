# backend/conf/ai.py - AI 配置
"""
AI 配置 - 参考 SiYuan kernel/conf/ai.go 模式
集中管理所有 AI 相关配置，支持环境变量覆盖
"""

import os
from typing import Dict, Any, Optional
from pydantic import Field
from .base import BaseConfig


class OpenAIConfig(BaseConfig):
    """OpenAI API 配置"""
    
    APIKey: str = Field(default="", description="OpenAI API Key")
    APITimeout: int = Field(default=30, description="请求超时时间(秒)")
    APIProxy: str = Field(default="", description="代理服务器")
    APIModel: str = Field(default="gpt-3.5-turbo", description="模型名称")
    APIMaxTokens: int = Field(default=2048, description="最大生成token数")
    APITemperature: float = Field(default=1.0, description="温度参数")
    APIMaxContexts: int = Field(default=7, description="最大上下文数")
    APIBaseURL: str = Field(default="https://api.openai.com/v1", description="API基础URL")
    APIUserAgent: str = Field(default="", description="User-Agent")
    APIProvider: str = Field(default="OpenAI", description="提供商: OpenAI, Azure")
    APIVersion: str = Field(default="", description="Azure API版本")
    
    class Config:
        env_prefix = "ZHIYI_OPENAI_"
    
    def __init__(self, **data):
        super().__init__(**data)
        # 从环境变量加载（兼容旧方式）
        if not self.APIKey:
            self.APIKey = os.getenv("SIYUAN_OPENAI_API_KEY", "")
        if not self.APITimeout:
            self.APITimeout = int(os.getenv("SIYUAN_OPENAI_API_TIMEOUT", "30"))
        if not self.APIProxy:
            self.APIProxy = os.getenv("SIYUAN_OPENAI_API_PROXY", "")
        if not self.APIMaxTokens:
            self.APIMaxTokens = int(os.getenv("SIYUAN_OPENAI_API_MAX_TOKENS", "2048"))
        if not self.APITemperature:
            self.APITemperature = float(os.getenv("SIYUAN_OPENAI_API_TEMPERATURE", "1.0"))
        if not self.APIMaxContexts:
            self.APIMaxContexts = int(os.getenv("SIYUAN_OPENAI_API_MAX_CONTEXTS", "7"))
        if not self.APIBaseURL:
            self.APIBaseURL = os.getenv("SIYUAN_OPENAI_API_BASE_URL", "https://api.openai.com/v1")
        if not self.APIUserAgent:
            self.APIUserAgent = os.getenv("SIYUAN_OPENAI_API_USER_AGENT", "")
    
    @property
    def is_enabled(self) -> bool:
        """检查 API 是否可用"""
        return bool(self.APIKey)


class AIConfig(BaseConfig):
    """AI 配置主类"""
    
    # AI 提供商配置
    OpenAI: OpenAIConfig = Field(default_factory=OpenAIConfig)
    
    # 默认 AI 提供者
    default_provider: str = Field(default="openai", description="默认AI提供者: openai, npu")
    
    # 本地模型配置
    use_local_model: bool = Field(default=True, description="优先使用本地NPU模型")
    local_model_name: str = Field(default="qwen2.0-7b", description="默认本地模型")
    
    class Config:
        env_prefix = "ZHIYI_AI_"
    
    def get_provider_config(self, provider: Optional[str] = None) -> BaseConfig:
        """获取指定提供者的配置"""
        if provider is None:
            provider = self.default_provider
        
        if provider == "openai":
            return self.OpenAI
        # 可以扩展其他提供者
        return self.OpenAI