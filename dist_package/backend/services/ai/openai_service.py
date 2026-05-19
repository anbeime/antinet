# backend/services/ai/openai_service.py - OpenAI 服务实现
"""
OpenAI 服务实现
"""

import os
import logging
from typing import List, Optional, Dict, Any
from .base import BaseAI, AIResponse

logger = logging.getLogger(__name__)

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("[AI] OpenAI SDK 未安装")


class OpenAIService(BaseAI):
    """OpenAI API 服务"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.api_key = self.config.get('api_key') or os.getenv('SIYUAN_OPENAI_API_KEY', '')
        self.api_timeout = self.config.get('timeout', 30)
        self.api_proxy = self.config.get('proxy') or os.getenv('SIYUAN_OPENAI_API_PROXY', '')
        self.api_model = self.config.get('model', 'gpt-3.5-turbo')
        self.api_max_tokens = self.config.get('max_tokens', 2048)
        self.api_temperature = self.config.get('temperature', 1.0)
        self.api_base_url = self.config.get('base_url', 'https://api.openai.com/v1')
        self._client: Optional[Any] = None
    
    def chat(self, message: str, context: Optional[List[str]] = None) -> AIResponse:
        if not self.is_available:
            return AIResponse(content='', stop=True, error='OpenAI API 不可用')
        
        if message.strip() == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        
        return AIResponse(content=f"[OpenAI] {message[:50]}...", stop=True)
    
    def chat_with_action(self, message: str, action: str, context: Optional[List[str]] = None) -> AIResponse:
        if action == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        return self.chat(message, context)
    
    @property
    def name(self) -> str:
        return 'openai'
    
    @property
    def is_available(self) -> bool:
        return OPENAI_AVAILABLE and bool(self.api_key)
