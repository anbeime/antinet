"""
多模型 API 路由
提供多模型管理和切换功能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/multi", tags=["多模型API"])

_available_models = {
    "qwen2.0-7b": {
        "name": "Qwen2.0-7B-SSD",
        "description": "通用大语言模型，适合对话和文本生成",
        "params": "7B",
        "quantization": "INT8",
        "max_tokens": 4096,
        "recommended": True
    },
    "qwen2.5-vl": {
        "name": "Qwen2.5-VL-3B",
        "description": "视觉语言模型，支持图片理解",
        "params": "3B",
        "quantization": "INT8",
        "max_tokens": 4096,
        "recommended": False
    },
    "llama3.1-8b": {
        "name": "Llama3.1-8B-SSD",
        "description": "Meta Llama 模型，多语言支持",
        "params": "8B",
        "quantization": "INT8",
        "max_tokens": 4096,
        "recommended": False
    },
    "llama3.2-3b": {
        "name": "Llama3.2-3B",
        "description": "轻量级 Llama 模型",
        "params": "3B",
        "quantization": "INT8",
        "max_tokens": 4096,
        "recommended": False
    }
}

_current_model = "qwen2.0-7b"


class ModelInfo(BaseModel):
    """模型信息"""
    id: str
    name: str
    description: str
    params: str
    quantization: str
    max_tokens: int
    recommended: bool
    loaded: bool = False


class SwitchModelRequest(BaseModel):
    """切换模型请求"""
    model_id: str = Field(..., description="模型ID")


class InferenceRequest(BaseModel):
    """推理请求"""
    prompt: str = Field(..., description="输入提示")
    model_id: Optional[str] = Field(None, description="模型ID（可选）")
    max_tokens: int = Field(default=512, description="最大生成长度")
    temperature: float = Field(default=0.7, description="温度参数")


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "multi-model-api",
        "current_model": _current_model,
        "available_models": len(_available_models)
    }


@router.get("/models", response_model=List[ModelInfo])
async def list_models():
    """列出所有可用模型"""
    models = []
    for model_id, info in _available_models.items():
        models.append(ModelInfo(
            id=model_id,
            name=info["name"],
            description=info["description"],
            params=info["params"],
            quantization=info["quantization"],
            max_tokens=info["max_tokens"],
            recommended=info["recommended"],
            loaded=(model_id == _current_model)
        ))
    return models


@router.get("/current")
async def get_current_model():
    """获取当前模型"""
    info = _available_models.get(_current_model, {})
    return {
        "current_model": _current_model,
        "model_info": info
    }


@router.post("/switch")
async def switch_model(request: SwitchModelRequest):
    """切换模型"""
    global _current_model
    
    if request.model_id not in _available_models:
        raise HTTPException(
            status_code=404,
            detail=f"模型不存在: {request.model_id}。可用模型: {', '.join(_available_models.keys())}"
        )
    
    old_model = _current_model
    _current_model = request.model_id
    
    return {
        "message": f"模型已切换",
        "old_model": old_model,
        "new_model": _current_model
    }


@router.post("/inference")
async def multi_model_inference(request: InferenceRequest):
    """使用指定模型进行推理"""
    model_id = request.model_id or _current_model
    
    if model_id not in _available_models:
        raise HTTPException(
            status_code=404,
            detail=f"模型不存在: {model_id}"
        )
    
    try:
        from models.model_loader import get_model_loader
        loader = get_model_loader()
        
        if not loader.is_loaded:
            loader.load()
        
        response = loader.infer(
            prompt=request.prompt,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return {
            "model": model_id,
            "prompt": request.prompt[:100] + "..." if len(request.prompt) > 100 else request.prompt,
            "response": response,
            "tokens_generated": len(response.split())
        }
    
    except Exception as e:
        logger.error(f"推理失败: {e}")
        raise HTTPException(status_code=500, detail=f"推理失败: {str(e)}")
