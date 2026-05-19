# backend/services/ai/base.py - AI 服务基类
"""
AI 服务基类 - 参考 SiYuan kernel/model/ai.go 的 GPT 接口模式
定义 AI 服务的抽象接口
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)


@dataclass
class AIResponse:
    """AI 响应数据结构"""
    content: str
    stop: bool = True
    error: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    
    @property
    def is_error(self) -> bool:
        return self.error is not None
    
    @property
    def is_stop(self) -> bool:
        return self.stop


class BaseAI(ABC):
    """AI 服务基类"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._context_messages: List[str] = []
        self._max_contexts: int = self.config.get('max_contexts', 7)
    
    @abstractmethod
    def chat(self, message: str, context: Optional[List[str]] = None) -> AIResponse:
        pass
    
    @abstractmethod
    def chat_with_action(self, message: str, action: str, context: Optional[List[str]] = None) -> AIResponse:
        pass
    
    def clear_context(self):
        """清除上下文消息"""
        self._context_messages = []
        logger.debug("[AI] 上下文已清除")
    
    def get_context(self) -> List[str]:
        """获取当前上下文"""
        return self._context_messages.copy()
    
    def add_context(self, message: str, response: str):
        """添加消息到上下文"""
        self._context_messages.append(message)
        self._context_messages.append(response)
        if len(self._context_messages) > self._max_contexts * 2:
            self._context_messages = self._context_messages[-self._max_contexts * 2:]
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass
