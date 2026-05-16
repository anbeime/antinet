# backend/services/ai/factory.py - AI 服务工厂
"""
AI 服务工厂 - 统一管理 AI 服务实例
参考 SiYuan 的 AI 服务管理模式
"""

from typing import Optional, Dict, Any
import logging

from .base import BaseAI, AIResponse
from .openai_service import OpenAIService
from .npu_service import NPUService

logger = logging.getLogger(__name__)


class AIServiceFactory:
    """
    AI 服务工厂
    统一管理多种 AI 服务的注册和获取
    """
    
    _services: Dict[str, BaseAI] = {}
    _default_service_name: Optional[str] = None
    
    @classmethod
    def register(cls, name: str, service: BaseAI, set_default: bool = False) -> None:
        """
        注册 AI 服务
        
        Args:
            name: 服务名称
            service: 服务实例
            set_default: 是否设为默认服务
        """
        cls._services[name] = service
        if set_default or cls._default_service_name is None:
            cls._default_service_name = name
        logger.info(f"[AI Factory] 注册服务: {name}")
    
    @classmethod
    def get(cls, name: str) -> Optional[BaseAI]:
        """获取指定名称的服务"""
        return cls._services.get(name)
    
    @classmethod
    def get_default(cls) -> Optional[BaseAI]:
        """获取默认服务"""
        if cls._default_service_name:
            return cls._services.get(cls._default_service_name)
        return None
    
    @classmethod
    def list_services(cls) -> Dict[str, BaseAI]:
        """列出所有已注册的服务"""
        return cls._services.copy()
    
    @classmethod
    def create_default_services(cls, config: Optional[Dict[str, Any]] = None) -> None:
        """
        创建默认的 AI 服务实例
        
        Args:
            config: 配置字典
        """
        config = config or {}
        
        # 注册 OpenAI 服务
        openai_service = OpenAIService(config.get('openai', {}))
        cls.register('openai', openai_service)
        
        # 注册 NPU 服务（默认使用 NPU）
        npu_service = NPUService(config.get('npu', {}))
        cls.register('npu', npu_service, set_default=True)
        
        logger.info(f"[AI Factory] 默认服务已创建，当前默认: {cls._default_service_name}")


def get_ai_service(name: Optional[str] = None) -> Optional[BaseAI]:
    """
    获取 AI 服务的便捷函数
    
    Args:
        name: 服务名称，None 则返回默认服务
        
    Returns:
        BaseAI: AI 服务实例
    """
    if name:
        return AIServiceFactory.get(name)
    return AIServiceFactory.get_default()


def create_ai_service(provider: str = 'npu', config: Optional[Dict[str, Any]] = None) -> Optional[BaseAI]:
    """
    创建指定提供者的 AI 服务
    
    Args:
        provider: 提供者名称 ('openai', 'npu')
        config: 配置
        
    Returns:
        BaseAI: AI 服务实例
    """
    if provider == 'openai':
        return OpenAIService(config)
    elif provider == 'npu':
        return NPUService(config)
    else:
        logger.warning(f"[AI] 未知提供者: {provider}")
        return None