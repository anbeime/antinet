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
    """
    AI 服务基类
    参考 SiYuan 的 GPT 接口设计模式
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._context_messages: List[str] = []
        self._max_contexts: int = self.config.get('max_contexts', 7)
    
    @abstractmethod
    def chat(self, message: str, context: Optional[List[str]] = None) -> AIResponse:
        """
        发送聊天消息
        
        Args:
            message: 用户消息
            context: 上下文消息列表
            
        Returns:
            AIResponse: AI 响应
        """
        pass
    
    @abstractmethod
    def chat_with_action(self, message: str, action: str, context: Optional[List[str]] = None) -> AIResponse:
        """
        带动作的聊天（用于 AI 功能操作）
        
        Args:
            message: 消息内容
            action: 操作类型（如 "Clear context"）
            context: 上下文
            
        Returns:
            AIResponse: AI 响应
        """
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
        
        # 限制上下文长度
        if len(self._context_messages) > self._max_contexts * 2:
            self._context_messages = self._context_messages[-self._max_contexts * 2:]
    
    @property
    @abstractmethod
    def name(self) -> str:
        """服务名称"""
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """服务是否可用"""
        pass
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name={self.name}, available={self.is_available})>"