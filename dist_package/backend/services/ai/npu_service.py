# backend/services/ai/npu_service.py - NPU 本地模型服务
"""
NPU 本地模型服务 - 使用 Qualcomm AI Engine (QNN)
"""

import os
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path
from .base import BaseAI, AIResponse

logger = logging.getLogger(__name__)


class NPUService(BaseAI):
    """NPU 本地模型服务"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.model_name = self.config.get('model_name', 'qwen2.0-7b')
        self.model_path = self.config.get('model_path', '')
        self.qnn_backend = self.config.get('backend', 'HTP')
        self.qnn_device = self.config.get('device', 'NPU')
        self.performance_mode = self.config.get('performance_mode', 'BURST')
        self._model_registry: Dict[str, Dict[str, Any]] = {}
        self._model = None
        self._initialized = False
        self._load_model_registry()
    
    def _load_model_registry(self):
        """加载模型注册表"""
        try:
            from config import MODEL_REGISTRY
            self._model_registry = MODEL_REGISTRY
        except ImportError:
            self._model_registry = {}
    
    def _get_model_config(self, model_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        name = model_name or self.model_name
        return self._model_registry.get(name)
    
    def _find_model_path(self, model_name: Optional[str] = None) -> Optional[str]:
        config = self._get_model_config(model_name)
        if not config:
            return None
        path = config.get('path', '')
        if path and Path(path).exists():
            return path
        return None
    
    def chat(self, message: str, context: Optional[List[str]] = None) -> AIResponse:
        if message.strip() == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        
        response = f"[NPU {self.model_name}] 处理: {message[:50]}..."
        self.add_context(message, response)
        return AIResponse(content=response, stop=True)
    
    def chat_with_action(self, message: str, action: str, context: Optional[List[str]] = None) -> AIResponse:
        if action == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        full_message = f"{action}:\n\n{message}"
        return self.chat(full_message, context)
    
    def list_models(self) -> List[str]:
        return list(self._model_registry.keys())
    
    @property
    def name(self) -> str:
        return 'npu'
    
    @property
    def is_available(self) -> bool:
        return True
