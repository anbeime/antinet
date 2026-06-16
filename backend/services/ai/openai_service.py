# backend/services/ai/openai_service.py - OpenAI 服务实现
"""
OpenAI 服务实现 - 参考 SiYuan kernel/model/ai.go 的 OpenAIGPT 模式
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
    """
    OpenAI API 服务
    参考 SiYuan 的 OpenAIGPT 实现
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        
        # 从配置或环境变量获取 API Key
        self.api_key = self.config.get('api_key') or os.getenv('SIYUAN_OPENAI_API_KEY', '')
        self.api_timeout = self.config.get('timeout', 30)
        self.api_proxy = self.config.get('proxy') or os.getenv('SIYUAN_OPENAI_API_PROXY', '')
        self.api_model = self.config.get('model', 'gpt-3.5-turbo')
        self.api_max_tokens = self.config.get('max_tokens', 2048)
        self.api_temperature = self.config.get('temperature', 1.0)
        self.api_base_url = self.config.get('base_url', 'https://api.openai.com/v1')
        self.api_provider = self.config.get('provider', 'OpenAI')
        self.api_version = self.config.get('version', '')
        
        self._client: Optional[Any] = None
    
    def _get_client(self):
        """获取或创建 OpenAI 客户端"""
        if not OPENAI_AVAILABLE:
            return None
            
        if self._client is None:
            # 设置代理
            http_client = None
            if self.api_proxy:
                try:
                    from urllib.parse import urlparse
                    import httpx
                    proxy_url = urlparse(self.api_proxy)
                    http_client = httpx.Client(proxy=proxy_url.geturl())
                except Exception as e:
                    logger.warning(f"[AI] 代理设置失败: {e}")
            
            kwargs = dict(
                api_key=self.api_key,
                base_url=self.api_base_url,
                timeout=self.api_timeout,
            )
            if http_client:
                kwargs['http_client'] = http_client
            
            if self.api_provider == 'Azure':
                from openai import AzureOpenAI
                self._client = AzureOpenAI(
                    api_key=self.api_key,
                    azure_endpoint=self.api_base_url,
                    api_version=self.api_version or '2024-02-15-preview',
                    timeout=self.api_timeout,
                )
            else:
                self._client = openai.OpenAI(**kwargs)
        
        return self._client
    
    def chat(self, message: str, context: Optional[List[str]] = None) -> AIResponse:
        """发送聊天消息"""
        if not self.is_available:
            return AIResponse(
                content='',
                stop=True,
                error='OpenAI API 不可用，请检查 API Key 配置'
            )
        
        # 处理 "Clear context" 特殊命令
        if message.strip() == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        
        # 构建消息列表
        messages = self._build_messages(message, context)
        
        try:
            client = self._get_client()
            if not client:
                return AIResponse(content='', stop=True, error='OpenAI 客户端初始化失败')
            
            response = client.chat.completions.create(
                model=self.api_model,
                messages=messages,
                max_tokens=self.api_max_tokens,
                temperature=self.api_temperature,
            )
            
            if not response.choices:
                return AIResponse(content='', stop=True, error='响应为空')
            
            content = response.choices[0].message.content or ''
            stop = response.choices[0].finish_reason != 'length'
            
            # 更新上下文
            self.add_context(message, content)
            
            return AIResponse(content=content.strip(), stop=stop)
            
        except Exception as e:
            logger.error(f"[AI] OpenAI 请求失败: {e}")
            return AIResponse(content='', stop=True, error=str(e))
    
    def chat_with_action(self, message: str, action: str, context: Optional[List[str]] = None) -> AIResponse:
        """带动作的聊天"""
        if action == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        
        # 将动作添加到消息前
        full_message = f"{action}:\n\n{message}"
        return self.chat(full_message, context)
    
    def _build_messages(self, message: str, context: Optional[List[str]]) -> List[Dict[str, str]]:
        """构建消息列表"""
        messages = []
        
        # 添加上下文消息
        if context:
            for ctx_msg in context:
                if ctx_msg:
                    messages.append({
                        'role': 'user',
                        'content': ctx_msg
                    })
        
        # 添加当前消息
        messages.append({
            'role': 'user',
            'content': message
        })
        
        return messages
    
    @property
    def name(self) -> str:
        return 'openai'
    
    @property
    def is_available(self) -> bool:
        return OPENAI_AVAILABLE and bool(self.api_key)
    
    def __repr__(self) -> str:
        return f"<OpenAIService(model={self.api_model}, available={self.is_available})>"