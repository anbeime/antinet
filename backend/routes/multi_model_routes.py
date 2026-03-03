"""
多模型 API 路由
提供多模型管理和切换功能
统一使用 ModelConfig.MODELS 作为唯一模型配置源
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/multi", tags=["多模型API"])


# ==================== 统一模型配置源 ====================

def _get_available_models() -> Dict[str, Dict]:
    """从 ModelConfig.MODELS 获取可用模型列表"""
    try:
        from models.model_loader import ModelConfig
        return ModelConfig.MODELS
    except Exception as e:
        logger.error(f"无法加载 ModelConfig: {e}")
        return {}


def _get_default_model() -> str:
    """从 ModelConfig 获取默认模型"""
    try:
        from models.model_loader import ModelConfig
        return ModelConfig.DEFAULT_MODEL
    except Exception:
        return "llama3.2-3b"


_current_model = _get_default_model()


# ==================== 数据模型 ====================

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
    path: str = ""
    path_exists: bool = False


class SwitchModelRequest(BaseModel):
    """切换模型请求"""
    model_id: str = Field(..., description="模型ID")


class InferenceRequest(BaseModel):
    """推理请求"""
    prompt: str = Field(..., description="输入提示")
    model_id: Optional[str] = Field(None, description="模型ID（可选）")
    max_tokens: int = Field(default=512, description="最大生成长度")
    temperature: float = Field(default=0.7, description="温度参数")


# ==================== 路由 ====================

@router.get("/health")
async def health_check():
    """健康检查"""
    models = _get_available_models()
    return {
        "status": "healthy",
        "service": "multi-model-api",
        "current_model": _current_model,
        "available_models": len(models)
    }


@router.get("/models", response_model=List[ModelInfo])
async def list_models():
    """列出所有可用模型，包含路径是否存在的检测"""
    models = []
    available = _get_available_models()
    for model_id, info in available.items():
        model_path = info.get("path", "")
        models.append(ModelInfo(
            id=model_id,
            name=info.get("name", model_id),
            description=info.get("description", ""),
            params=info.get("params", ""),
            quantization=info.get("quantization", ""),
            max_tokens=info.get("max_tokens", 2048),
            recommended=info.get("recommended", False),
            loaded=(model_id == _current_model),
            path=model_path,
            path_exists=os.path.exists(model_path) if model_path else False
        ))
    return models


@router.get("/current")
async def get_current_model():
    """获取当前模型"""
    available = _get_available_models()
    info = available.get(_current_model, {})
    model_path = info.get("path", "")
    return {
        "current_model": _current_model,
        "model_info": {
            "name": info.get("name", _current_model),
            "description": info.get("description", ""),
            "params": info.get("params", ""),
            "quantization": info.get("quantization", ""),
            "path": model_path,
            "path_exists": os.path.exists(model_path) if model_path else False
        }
    }


@router.post("/switch")
async def switch_model(request: SwitchModelRequest):
    """切换模型 —— 真正卸载旧模型、加载新模型"""
    global _current_model

    available = _get_available_models()
    if request.model_id not in available:
        raise HTTPException(
            status_code=404,
            detail=f"模型不存在: {request.model_id}。可用模型: {', '.join(available.keys())}"
        )

    model_path = available[request.model_id].get("path", "")
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=400,
            detail=f"模型路径不存在: {model_path}"
        )

    old_model = _current_model

    # 真正执行模型切换（使用全局单例，确保卸载的是真正加载的模型）
    try:
        from models.model_loader import NPUModelLoader, _global_model_loader
        import models.model_loader as ml_module

        # 卸载旧模型（使用全局实例，它才持有真正加载的模型）
        try:
            if ml_module._global_model_loader is not None:
                ml_module._global_model_loader.unload()
                logger.info(f"已卸载旧模型: {old_model}")
                ml_module._global_model_loader = None
        except Exception as e:
            logger.warning(f"卸载旧模型失败（可忽略）: {e}")

        # 加载新模型并更新全局实例
        new_loader = NPUModelLoader(request.model_id)
        new_loader.load()
        ml_module._global_model_loader = new_loader
        logger.info(f"已加载新模型: {request.model_id}")

        _current_model = request.model_id

        return {
            "success": True,
            "message": f"模型已切换: {old_model} → {_current_model}",
            "old_model": old_model,
            "new_model": _current_model
        }
    except Exception as e:
        logger.error(f"模型切换失败: {e}")
        raise HTTPException(status_code=500, detail=f"模型切换失败: {str(e)}")


@router.post("/inference")
async def multi_model_inference(request: InferenceRequest):
    """使用指定模型进行真实 NPU 推理"""
    model_id = request.model_id or _current_model

    available = _get_available_models()
    if model_id not in available:
        raise HTTPException(
            status_code=404,
            detail=f"模型不存在: {model_id}。可用模型: {', '.join(available.keys())}"
        )

    model_path = available[model_id].get("path", "")
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=400,
            detail=f"模型路径不存在: {model_path}，请检查 model_loader.py 中的 MODELS 配置"
        )

    try:
        from models.model_loader import NPUModelLoader
        import models.model_loader as ml_module

        # 优先使用全局 loader（如果模型匹配）
        loader = ml_module._global_model_loader
        if loader is None or loader.model_key != model_id:
            loader = NPUModelLoader(model_id)
            ml_module._global_model_loader = loader

        if not loader.is_loaded:
            loader.load()

        response = loader.infer(
            prompt=request.prompt,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature
        )

        return {
            "success": True,
            "model": model_id,
            "model_name": available[model_id].get("name", model_id),
            "prompt": request.prompt[:100] + "..." if len(request.prompt) > 100 else request.prompt,
            "response": response,
            "tokens_generated": len(response.split()) if response else 0
        }

    except Exception as e:
        logger.error(f"推理失败: {e}")
        raise HTTPException(status_code=500, detail=f"推理失败: {str(e)}")
