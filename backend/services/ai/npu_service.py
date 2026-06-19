# backend/services/ai/npu_service.py - NPU 本地模型服务
"""
NPU 本地模型服务 - 使用 Qualcomm AI Engine (QNN)
提供本地 NPU 加速的 AI 推理服务
"""

import os
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path
from .base import BaseAI, AIResponse

logger = logging.getLogger(__name__)


class NPUService(BaseAI):
    """
    NPU 本地模型服务
    使用 Qualcomm QNN SDK 进行端侧 AI 推理
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        
        # NPU 配置
        self.model_name = self.config.get('model_name', 'qwen2.0-7b')
        self.model_path = self.config.get('model_path', '')
        self.qnn_backend = self.config.get('backend', 'HTP')
        self.qnn_device = self.config.get('device', 'NPU')
        self.performance_mode = self.config.get('performance_mode', 'BURST')
        
        # 模型注册表
        self._model_registry: Dict[str, Dict[str, Any]] = {}
        self._model = None
        self._initialized = False
        
        # 加载模型注册表
        self._load_model_registry()
    
    def _load_model_registry(self):
        """加载模型注册表"""
        from config import MODEL_REGISTRY
        self._model_registry = MODEL_REGISTRY
    
    def _get_model_config(self, model_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """获取模型配置"""
        name = model_name or self.model_name
        return self._model_registry.get(name)
    
    def _find_model_path(self, model_name: Optional[str] = None) -> Optional[str]:
        """查找模型路径"""
        config = self._get_model_config(model_name)
        if not config:
            return None
        
        path = config.get('path', '')
        if path and Path(path).exists():
            return path
        
        return None
    
    def _ensure_npu_libs(self):
        """确保 NPU 库路径正确"""
        from config import find_qnn_sdk_path
        
        model_config = self._get_model_config()
        qnn_version = model_config.get('qnn_version', '2.37') if model_config else '2.37'
        
        lib_path = find_qnn_sdk_path(qnn_version)
        
        if lib_path and lib_path not in os.environ.get('PATH', ''):
            os.environ['PATH'] = lib_path + ';' + os.environ.get('PATH', '')
            os.add_dll_directory(lib_path)
        
        return lib_path
    
    def _load_model(self) -> bool:
        """加载模型"""
        if self._initialized:
            return True
        
        try:
            model_path = self._find_model_path()
            if not model_path:
                logger.warning(f"[NPU] 模型路径不存在: {self.model_name}")
                return False
            
            # 确保 NPU 库可用
            self._ensure_npu_libs()
            
            # TODO: 调用实际的模型加载逻辑
            # from npu_core import QNNModel
            # self._model = QNNModel(model_path, backend=self.qnn_backend)
            
            self._initialized = True
            logger.info(f"[NPU] 模型加载成功: {self.model_name}")
            return True
            
        except Exception as e:
            logger.error(f"[NPU] 模型加载失败: {e}")
            return False
    
    def chat(self, message: str, context: Optional[List[str]] = None) -> AIResponse:
        """发送聊天消息"""
        # 处理 "Clear context" 特殊命令
        if message.strip() == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        
        if not self._initialized:
            if not self._load_model():
                return AIResponse(
                    content='',
                    stop=True,
                    error='NPU 模型加载失败'
                )
        
        try:
            # 尝试真实 NPU 推理（如不可用则返回错误让上游降级）
            if self._model is not None and hasattr(self._model, 'generate'):
                response_text = self._model.generate(
                    message,
                    context=context or self._context_messages,
                    max_tokens=self.config.get('max_tokens', 2048),
                    temperature=self.config.get('temperature', 0.7),
                )
                self.add_context(message, response_text)
                return AIResponse(content=response_text, stop=True)
            else:
                # NPU 模型推理未实现，返回错误让上游感知并降级
                return AIResponse(
                    content='',
                    stop=True,
                    error='NPU 模型推理引擎未实现，请使用云端 AI 或检查模型配置'
                )
            
        except Exception as e:
            logger.error(f"[NPU] 推理失败: {e}")
            return AIResponse(content='', stop=True, error=str(e))
    
    def chat_with_action(self, message: str, action: str, context: Optional[List[str]] = None) -> AIResponse:
        """带动作的聊天"""
        if action == 'Clear context':
            self.clear_context()
            return AIResponse(content='', stop=True)
        
        full_message = f"{action}:\n\n{message}"
        return self.chat(full_message, context)
    
    def set_model(self, model_name: str) -> bool:
        """切换模型"""
        if model_name not in self._model_registry:
            logger.warning(f"[NPU] 未知模型: {model_name}")
            return False
        
        self.model_name = model_name
        self._initialized = False
        self._model = None
        
        return self._load_model()
    
    def list_models(self) -> List[str]:
        """列出可用模型"""
        return list(self._model_registry.keys())
    
    @property
    def name(self) -> str:
        return 'npu'
    
    @property
    def is_available(self) -> bool:
        """NPU 仅在模型已加载且推理引擎可用时才视为可用"""
        if not (self._initialized or self._find_model_path() is not None):
            return False
        # 模型路径存在但推理未实现，不算可用
        if self._model is None:
            return False
        return True
    
    def __repr__(self) -> str:
        return f"<NPUService(model={self.model_name}, initialized={self._initialized})>"