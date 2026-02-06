"""
模型管理路由 - 使用 NPUModelLoader
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

from backend.models.model_loader import NPUModelLoader, ModelConfig

router = APIRouter(prefix="/models", tags=["models"])
logger = logging.getLogger(__name__)

# 全局模型加载器缓存
_loaded_models: Dict[str, NPUModelLoader] = {}


@router.get("/list")
async def list_models():
    """列出所有可用模型"""
    models = []
    for key, config in ModelConfig.MODELS.items():
        models.append({
            "name": key,
            "display_name": config["name"],
            "path": config["path"],
            "params": config["params"],
            "quantization": config["quantization"],
            "description": config["description"],
            "max_tokens": config["max_tokens"],
            "recommended": config.get("recommended", False),
            "loaded": key in _loaded_models
        })
    
    return {
        "models": models,
        "default_model": ModelConfig.DEFAULT_MODEL,
        "loaded_count": len(_loaded_models)
    }


@router.post("/load/{model_name}")
async def load_model(model_name: str):
    """加载指定模型"""
    try:
        if model_name not in ModelConfig.MODELS:
            raise HTTPException(
                status_code=404,
                detail=f"模型不存在: {model_name}。可用模型: {', '.join(ModelConfig.MODELS.keys())}"
            )
        
        # 检查是否已加载
        if model_name in _loaded_models:
            return {
                "message": f"模型已加载: {model_name}",
                "model_name": model_name,
                "status": "already_loaded"
            }
        
        # 加载模型
        logger.info(f"开始加载模型: {model_name}")
        import time
        start_time = time.time()
        
        loader = NPUModelLoader(model_name)
        loader.load()
        
        load_time = time.time() - start_time
        
        # 缓存加载器
        _loaded_models[model_name] = loader
        
        logger.info(f"模型加载成功: {model_name}, 耗时: {load_time:.2f}秒")
        
        return {
            "message": f"模型加载成功: {model_name}",
            "model_name": model_name,
            "load_time": f"{load_time:.2f}秒",
            "status": "loaded"
        }
    
    except Exception as e:
        logger.error(f"加载模型失败: {e}")
        raise HTTPException(status_code=500, detail=f"加载模型失败: {str(e)}")


@router.post("/unload/{model_name}")
async def unload_model(model_name: str):
    """卸载模型"""
    if model_name in _loaded_models:
        del _loaded_models[model_name]
        return {
            "message": f"模型卸载成功: {model_name}",
            "model_name": model_name,
            "status": "unloaded"
        }
    else:
        return {
            "message": f"模型未加载: {model_name}",
            "model_name": model_name,
            "status": "not_loaded"
        }


@router.get("/info/{model_name}")
async def get_model_info(model_name: str):
    """获取模型信息"""
    if model_name not in ModelConfig.MODELS:
        raise HTTPException(status_code=404, detail=f"模型不存在: {model_name}")
    
    config = ModelConfig.MODELS[model_name]
    return {
        "name": model_name,
        "display_name": config["name"],
        "path": config["path"],
        "params": config["params"],
        "quantization": config["quantization"],
        "description": config["description"],
        "max_tokens": config["max_tokens"],
        "recommended": config.get("recommended", False),
        "loaded": model_name in _loaded_models
    }


@router.get("/current")
async def get_current_model():
    """获取当前默认模型"""
    default_model = ModelConfig.DEFAULT_MODEL
    return {
        "default_model": default_model,
        "model_info": ModelConfig.MODELS.get(default_model),
        "loaded": default_model in _loaded_models
    }
