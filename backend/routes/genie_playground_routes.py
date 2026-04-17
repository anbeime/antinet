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

# 可用模型列表
# NPU 模型: GenieAPIService 一次只能加载一个，切换需重启
# Ollama 模型: 通过 Ollama 服务运行

AVAILABLE_MODELS = {
    "qwen2.5vl3b": {
        "name": "Qwen 2.5 VL 3B",
        "type": "vision",
        "description": "多模态视觉语言模型, 启动视觉模型服务.bat 默认加载此模型",
        "context_length": 2048,
        "has_weights": True,
        "config_path": "models/qwen2.5vl3b-8380-2.42/config.json",
    },
    "Qwen2.0-7B-SSD": {
        "name": "Qwen 2.0 7B (SSD)",
        "type": "chat",
        "description": "中文优化模型 (Speculative Decoding), 需重启GenieAPIService加载",
        "context_length": 4096,
        "has_weights": True,
        "config_path": "models/Qwen2.0-7B-SSD-8380-2.34/config.json",
    },
    "llama3.2-3b": {
        "name": "Llama 3.2 3B",
        "type": "chat",
        "description": "Meta Llama 3.2 3B 轻量模型, 需重启GenieAPIService加载",
        "context_length": 4096,
        "has_weights": True,
        "config_path": "models/llama3.2-3b-8380-qnn2.37/config.json",
    },
    "bge-base-zh": {
        "name": "BGE Base Chinese",
        "type": "embedding",
        "description": "中文嵌入模型, 不支持对话",
        "context_length": 512,
        "has_weights": True,
        "config_path": "models/bge-base-zh-v1.5-qnn-8380/config.json",
    },
    # === Ollama 远程模型 ===
    "glm-5.1-cloud": {
        "name": "GLM-5.1 Cloud",
        "type": "ollama",
        "description": "智谱GLM-5.1 云端大模型, 需要Ollama Pro订阅",
        "context_length": 128000,
        "has_weights": True,
        "ollama_model": "glm-5.1:cloud",
        "ollama_url": "http://localhost:11434",
    },
    "gemma4": {
        "name": "Gemma 4 8B",
        "type": "ollama",
        "description": "Google Gemma 4 8B, 通过Ollama本地运行",
        "context_length": 131072,
        "has_weights": True,
        "ollama_model": "gemma4:latest",
        "ollama_url": "http://localhost:11434",
    },
    "gpt-oss-20b": {
        "name": "GPT-OSS 20B",
        "type": "ollama",
        "description": "开源大模型 20B, 通过Ollama本地运行",
        "context_length": 8192,
        "has_weights": True,
        "ollama_model": "gpt-oss:20b",
        "ollama_url": "http://localhost:11434",
    },
}


# ==================== 数据模型 ====================

class GenieChatRequest(BaseModel):
    """Genie 聊天请求"""
    model: str = Field(default="qwen2.5vl3b", description="模型ID")
    messages: List[Dict[str, Any]] = Field(..., description="消息列表")
    stream: bool = Field(default=False, description="是否流式输出")
    temperature: float = Field(default=0.7, description="温度参数")
    top_k: int = Field(default=1, description="Top-K")
    top_p: float = Field(default=1.0, description="Top-P")
    max_tokens: int = Field(default=2048, description="最大token数")


class GenieVisionChatRequest(BaseModel):
    """Genie 视觉聊天请求（前端传 base64 图片）"""
    model: str = Field(default="qwen2.5vl3b", description="模型ID")
    text: str = Field(..., description="文本提示")
    image_base64: Optional[str] = Field(None, description="图片base64编码")
    image_mime: Optional[str] = Field(default="jpeg", description="图片MIME类型")
    stream: bool = Field(default=False, description="是否流式输出")
    temperature: float = Field(default=0.7, description="温度参数")
    top_k: int = Field(default=1, description="Top-K")
    top_p: float = Field(default=1.0, description="Top-P")
    max_tokens: int = Field(default=2048, description="最大token数")


# ==================== 路由 ====================

@router.get("/models")
async def list_genie_models():
    """列出 GenieAPIService 支持的所有模型"""
    models = []
    for model_id, info in AVAILABLE_MODELS.items():
        models.append({
            "id": model_id,
            "name": info["name"],
            "type": info["type"],
            "description": info["description"],
            "context_length": info["context_length"],
            "has_weights": info.get("has_weights", False),
            "config_path": info.get("config_path", ""),
            "available": True,
        })
    return {"models": models, "total": len(models)}


@router.get("/service-status")
async def check_genie_service():
    """检查 GenieAPIService 是否可用，并获取其已加载的模型"""
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
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get("http://localhost:11434/api/tags")
            ollama_available = response.status_code == 200
    except:
        pass
    
    is_vision = "vl" in genie_current.lower() or "vision" in genie_current.lower()
    
    return {
        "available": genie_available,
        "service_url": GENIE_SERVICE_URL,
        "loaded_models": genie_loaded,
        "current_model": genie_current,
        "current_model_type": "vision" if is_vision else "chat",
        "ollama_available": ollama_available,
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


async def _ollama_chat(model_id: str, model_info: dict, messages: list, temperature: float = 0.7, max_tokens: int = 2048) -> str:
    """使用 Ollama API 进行聊天"""
    ollama_model = model_info.get("ollama_model", model_id)
    ollama_url = model_info.get("ollama_url", "http://localhost:11434")
    
    # 转换消息格式 - Ollama 格式
    ollama_messages = []
    for msg in messages:
        ollama_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": ollama_model,
                    "messages": ollama_messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            content = result.get("message", {}).get("content", "")
            if content:
                return content.strip()
            return ""
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=500, detail=f"Ollama 错误: {e.response.text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama 调用失败: {str(e)}")


async def _check_ollama_available(model_info: dict) -> bool:
    """检查 Ollama 服务是否可用"""
    ollama_url = model_info.get("ollama_url", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get(f"{ollama_url}/api/tags")
            return response.status_code == 200
    except:
        return False


@router.post("/chat")
async def genie_chat(request: GenieChatRequest):
    """通过 GenieAPIService 进行聊天（非流式）"""
    if request.model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}")

    model_info = AVAILABLE_MODELS[request.model]
    
    # 检查是否是 Ollama 模型
    if model_info.get("type") == "ollama":
        ollama_available = await _check_ollama_available(model_info)
        if not ollama_available:
            raise HTTPException(status_code=503, detail="Ollama 服务未启动，请先运行: ollama serve")
        try:
            content = await _ollama_chat(request.model, model_info, request.messages, request.temperature, request.max_tokens)
            return {
                "success": True,
                "model": request.model,
                "response": content,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ollama 调用失败: {str(e)}")

    # 获取 GenieAPIService 当前实际加载的模型名
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用或未加载模型")

    request_data = {
        "model": loaded_model,  # 使用服务端实际加载的模型名
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
                    "raw": result,
                }
            return {"success": True, "model": request.model, "response": str(result), "raw": result}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GenieAPIService 超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"GenieAPIService 错误: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用失败: {str(e)}")


@router.post("/chat/stream")
async def genie_chat_stream(request: GenieChatRequest):
    """通过 GenieAPIService 进行流式聊天"""
    if request.model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}")

    model_info = AVAILABLE_MODELS[request.model]
    
    # 检查是否是 Ollama 模型
    if model_info.get("type") == "ollama":
        ollama_available = await _check_ollama_available(model_info)
        if not ollama_available:
            raise HTTPException(status_code=503, detail="Ollama 服务未启动，请先运行: ollama serve")
        # Ollama 不支持流式，直接返回
        try:
            content = await _ollama_chat(request.model, model_info, request.messages, request.temperature, request.max_tokens)
            async def ollama_stream():
                yield f"data: {json.dumps({'content': content, 'model': request.model})}\n\n"
                yield f"data: [DONE]\n\n"
            return StreamingResponse(ollama_stream(), media_type="text/event-stream")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ollama 调用失败: {str(e)}")

    # 获取 GenieAPIService 当前实际加载的模型名
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用或未加载模型")

    request_data = {
        "model": loaded_model,  # 使用服务端实际加载的模型名
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
                                    yield f"data: {json.dumps({'content': content, 'model': request.model})}\n\n"
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
    if request.model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}")

    model_info = AVAILABLE_MODELS[request.model]
    if model_info["type"] != "vision":
        raise HTTPException(status_code=400, detail=f"模型 {request.model} 不支持视觉功能，请使用 vision 类型模型")

    # 获取 GenieAPIService 当前实际加载的模型名
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用或未加载模型")

    # 检查当前加载的是否是视觉模型
    if "vl" not in loaded_model.lower() and "vision" not in loaded_model.lower():
        raise HTTPException(
            status_code=400,
            detail=f"当前加载的模型是 {loaded_model}，不是视觉模型。请重启 GenieAPIService 加载视觉模型(qwen2.5vl3b)。"
        )

    # 构建 OpenAI 视觉格式消息
    if request.image_base64:
        user_content = [
            {"type": "text", "text": request.text},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/{request.image_mime};base64,{request.image_base64}"
                }
            }
        ]
    else:
        user_content = request.text

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_content}
    ]

    request_data = {
        "model": loaded_model,  # 使用服务端实际加载的模型名
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
