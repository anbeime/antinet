#!/usr/bin/env python3
# backend/routes/genie_playground_routes.py - Genie 模型测试场地路由
"""
通过 GenieAPIService (端口8910) 调用多个端侧模型
不改动现有模型调用功能，独立测试页面
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import httpx
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/genie-playground", tags=["Genie模型测试场"])

# GenieAPIService 地址
GENIE_SERVICE_URL = "http://127.0.0.1:8910"

# ==================== 动态获取真实可用的模型 ====================

async def get_genie_available_models() -> Dict[str, Dict]:
    """从 GenieAPIService (端口8910) 获取真正可用的模型"""
    models = {}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    if model_id:
                        # 根据模型名称判断类型
                        model_type = "chat"
                        if "vl" in model_id.lower() or "vision" in model_id.lower():
                            model_type = "vision"
                        elif "embed" in model_id.lower():
                            model_type = "embedding"
                        
                        models[model_id] = {
                            "name": model_id,
                            "type": model_type,
                            "description": f"NPU 端侧模型 - 通过 GenieAPIService (8910) 调用",
                            "context_length": 4096,
                            "has_weights": True,
                            "service": "genie",
                            "root_url": GENIE_SERVICE_URL,
                        }
    except Exception as e:
        logger.warning(f"无法连接到 GenieAPIService: {e}")
    
    return models


async def get_available_models() -> Dict[str, Dict]:
    """获取所有可用模型（从 GenieAPIService 真实获取）"""
    # 从 GenieAPIService 获取真实可用的模型
    genie_models = await get_genie_available_models()
    
    if genie_models:
        logger.info(f"[GeniePlayground] 从8910获取到 {len(genie_models)} 个模型: {list(genie_models.keys())}")
        return genie_models
    
    logger.warning("[GeniePlayground] 无法从8910获取模型，返回空列表")
    return {}


# ==================== 旧版兼容 ====================
# 仅保留基础模型配置，实际可用模型由 get_available_models() 动态获取

AVAILABLE_MODELS = {}  # 动态获取，不使用静态配置


# ==================== 数据模型 ====================

class GenieChatRequest(BaseModel):
    """Genie 聊天请求"""
    model: str = Field(default="qwen2.5vl3b-8380-2.42", description="模型ID")
    messages: List[Dict[str, Any]] = Field(..., description="消息列表")
    stream: bool = Field(default=False, description="是否流式输出")
    temperature: float = Field(default=0.7, description="温度参数")
    top_k: int = Field(default=1, description="Top-K")
    top_p: float = Field(default=1.0, description="Top-P")
    max_tokens: int = Field(default=2048, description="最大token数")


class GenieVisionChatRequest(BaseModel):
    """Genie 视觉聊天请求（前端传 base64 图片）"""
    model: str = Field(default="qwen2.5vl3b-8380-2.42", description="模型ID")
    text: str = Field(..., description="文本提示")
    image_base64: Optional[str] = Field(None, description="图片base64编码")
    image_mime: Optional[str] = Field(default="jpeg", description="图片MIME类型")
    stream: bool = Field(default=False, description="是否流式输出")
    temperature: float = Field(default=0.7, description="温度参数")
    top_k: int = Field(default=1, description="Top-K")
    top_p: float = Field(default=1.0, description="Top-P")
    max_tokens: int = Field(default=2048, description="最大token数")


@router.get("/models-v2")
async def list_genie_models_v2():
    """列出所有可用模型（从 GenieAPIService 真实获取）"""
    import time
    models = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    if model_id:
                        model_type = "chat"
                        if "vl" in model_id.lower() or "vision" in model_id.lower():
                            model_type = "vision"
                        elif "embed" in model_id.lower():
                            model_type = "embedding"
                        
                        models.append({
                            "id": model_id,
                            "name": model_id,
                            "type": model_type,
                            "description": f"NPU 端侧模型 - 通过 GenieAPIService (8910) 调用",
                            "context_length": 4096,
                            "has_weights": True,
                            "config_path": "",
                            "service": "genie",
                            "available": True,
                        })
    except Exception as e:
        logger.error(f"获取模型失败: {e}")
    
    return {"models": models, "total": len(models), "version": "v2", "timestamp": int(time.time())}


@router.get("/service-status")
async def check_genie_service():
    """检查各服务的可用状态"""
    # 检查 GenieAPIService (NPU)
    genie_available = False
    genie_loaded = []
    genie_current = ""
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                loaded_models = [m.get("id", "") for m in data.get("data", [])]
                if loaded_models:
                    genie_available = True
                    genie_loaded = loaded_models
                    genie_current = loaded_models[0]
    except:
        pass
    
    # 检查 Ollama 服务
    ollama_available = False
    ollama_models = []
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                ollama_available = True
                data = response.json()
                ollama_models = [m.get("name", "") for m in data.get("models", [])]
    except:
        pass
    
    is_vision = "vl" in genie_current.lower() or "vision" in genie_current.lower()
    
    # 获取从 GenieAPIService 真实获取的模型
    available = await get_available_models()
    
    return {
        "services": {
            "genie": {
                "available": genie_available,
                "url": GENIE_SERVICE_URL,
                "loaded_models": genie_loaded,
                "current_model": genie_current,
                "current_model_type": "vision" if is_vision else "chat",
                "model_count": len(genie_loaded)
            }
        },
        "available_models": list(available.keys()),
        "hint": f"请启动 GenieAPIService (端口 {GENIE_SERVICE_URL.replace('http://','')})" if not genie_available else ""
    }


async def get_loaded_model_name() -> str | None:
    """从 GenieAPIService 获取当前加载的模型名"""
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                if models:
                    return models[0].get("id", None)
    except:
        pass
    return None


@router.post("/chat")
async def genie_chat(request: GenieChatRequest):
    """通过 GenieAPIService 进行聊天（非流式）"""
    available = await get_available_models()
    
    if request.model not in available:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}. 可用模型: {list(available.keys())}")

    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用，请确保服务已启动 (端口 8910)")

    request_data = {
        "model": loaded_model,
        "messages": request.messages,
        "stream": False,
        "size": request.max_tokens,
        "temp": request.temperature,
        "top_k": request.top_k,
        "top_p": request.top_p,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json=request_data,
            )
            response.raise_for_status()
            result = response.json()

            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
                return {
                    "success": True,
                    "model": request.model,
                    "response": content,
                }
            return {"success": True, "model": request.model, "response": str(result), "raw": result}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GenieAPIService 超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"GenieAPIService 错误: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用失败: {str(e)}")

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GenieAPIService 超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"GenieAPIService 错误: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用失败: {str(e)}")


@router.post("/chat/stream")
async def genie_chat_stream(request: GenieChatRequest):
    """通过 GenieAPIService 进行聊天（流式）"""
    available = await get_available_models()
    
    if request.model not in available:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}. 可用模型: {list(available.keys())}")

    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用，请确保服务已启动 (端口 8910)")

    request_data = {
        "model": loaded_model,
        "messages": request.messages,
        "stream": True,
        "size": request.max_tokens,
        "temp": request.temperature,
        "top_k": request.top_k,
        "top_p": request.top_p,
    }

async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{GENIE_SERVICE_URL}/v1/chat/completions",
                    json=request_data,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                yield f"data: [DONE]\n\n"
                                break
                            try:
                                data = json.loads(data_str)
                                content = ""
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except json.JSONDecodeError:
                                pass
        except httpx.TimeoutException:
            yield f"data: {json.dumps({'error': 'GenieAPIService 超时'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield f"data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/vision-chat")
async def genie_vision_chat(request: GenieVisionChatRequest):
    """通过 GenieAPIService 进行视觉聊天（图文混合）"""
    available = await get_available_models()
    
    if request.model not in available:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}. 可用模型: {list(available.keys())}")

    model_info = available[request.model]
    if model_info.get("type") != "vision":
        raise HTTPException(status_code=400, detail=f"模型 {request.model} 不支持视觉功能")

    # 通过 GenieAPIService 调用
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用，请确保服务已启动 (端口 8910)")

    if "vl" not in loaded_model.lower() and "vision" not in loaded_model.lower():
        raise HTTPException(
            status_code=400,
            detail=f"当前加载的模型是 {loaded_model}，不是视觉模型。请重启 GenieAPIService 加载视觉模型(qwen2.5vl3b)。"
        )

    user_content = [
        {"type": "text", "text": request.text},
    ]
    
    if request.image_base64:
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/{request.image_mime};base64,{request.image_base64}"
            }
        })

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_content}
    ]

    request_data = {
        "model": loaded_model,
        "messages": messages,
        "stream": False,
        "size": request.max_tokens,
        "temp": request.temperature,
        "top_k": request.top_k,
        "top_p": request.top_p,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json=request_data,
            )
            response.raise_for_status()
            result = response.json()

            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
                return {
                    "success": True,
                    "model": request.model,
                    "response": content,
                    "has_image": request.image_base64 is not None,
                }
            return {"success": True, "model": request.model, "response": str(result)}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GenieAPIService 超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"GenieAPIService 错误: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用失败: {str(e)}")


@router.post("/batch-test")
async def batch_test_models():
    """测试当前加载的模型是否可用"""
    # 获取当前加载的模型
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        return {"results": [{"model": "N/A", "name": "N/A", "status": "error", "error": "GenieAPIService 不可用"}], "total": 1}

    prompt = "Hello! Please introduce yourself in one sentence."
    results = []

    request_data = {
        "model": loaded_model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "size": 512,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 1.0,
        
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json=request_data,
            )
            if response.status_code == 200:
                result = response.json()
                content = ""
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0].get("message", {}).get("content", "")
                results.append({
                    "model": loaded_model,
                    "name": loaded_model,
                    "status": "success",
                    "response": content[:200],
                })
            else:
                results.append({
                    "model": loaded_model,
                    "name": loaded_model,
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                })
    except Exception as e:
        results.append({
            "model": loaded_model,
            "name": loaded_model,
            "status": "error",
            "error": str(e),
        })

    return {"results": results, "total": len(results)}
