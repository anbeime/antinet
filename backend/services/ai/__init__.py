# backend/services/ai/__init__.py - AI 服务模块
"""
AI 服务模块 - 参考 SiYuan kernel/model/ai.go 架构
提供统一的 AI 接口抽象，支持多种 AI 提供者
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

# 导出所有 AI 服务类
from .base import BaseAI, AIResponse
from .openai_service import OpenAIService
from .npu_service import NPUService
from .factory import AIServiceFactory, get_ai_service, create_ai_service

__all__ = [
    'BaseAI',
    'AIResponse',
    'OpenAIService',
    'NPUService',
    'AIServiceFactory',
    'get_ai_service',
    'create_ai_service',
]