# backend/services/ai/factory.py - AI 服务工厂
"""
AI 服务工厂 - 统一管理 AI 服务实例
"""

from typing import Optional, Dict, Any
import logging

from .base import BaseAI, AIResponse
from .openai_service import OpenAIService
from .npu_service import NPUService

logger = logging.getLogger(__name__)


class AIServiceFactory:
    """AI 服务工厂"""
    
    _services: Dict[str, BaseAI] = {}
    _default_service_name: Optional[str] = None
    
    @classmethod
    def register(cls, name: str, service: BaseAI, set_default: bool = False) -> None:
        cls._services[name] = service
        if set_default or cls._default_service_name is None:
            cls._default_service_name = name
        logger.info(f"[AI Factory] 注册服务: {name}")
    
    @classmethod
    def get(cls, name: str) -> Optional[BaseAI]:
        return cls._services.get(name)
    
    @classmethod
    def get_default(cls) -> Optional[BaseAI]:
        if cls._default_service_name:
            return cls._services.get(cls._default_service_name)
        return None
    
    @classmethod
    def list_services(cls) -> Dict[str, BaseAI]:
        return cls._services.copy()
    
    @classmethod
    def create_default_services(cls, config: Optional[Dict[str, Any]] = None) -> None:
        config = config or {}
        openai_service = OpenAIService(config.get('openai', {}))
        cls.register('openai', openai_service)
        npu_service = NPUService(config.get('npu', {}))
        cls.register('npu', npu_service, set_default=True)
        logger.info(f"[AI Factory] 默认服务已创建，当前默认: {cls._default_service_name}")


def get_ai_service(name: Optional[str] = None) -> Optional[BaseAI]:
    if name:
        return AIServiceFactory.get(name)
    return AIServiceFactory.get_default()


def create_ai_service(provider: str = 'npu', config: Optional[Dict[str, Any]] = None) -> Optional[BaseAI]:
    if provider == 'openai':
        return OpenAIService(config)
    elif provider == 'npu':
        return NPUService(config)
    else:
        logger.warning(f"[AI] 未知提供者: {provider}")
        return None
