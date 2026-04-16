#!/usr/bin/env python3
# backend/routes/vision_routes.py - 视觉模型路由
"""
提供图片理解和多模态对话功能
集成 Qwen2.5-VL-3B 模型服务
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import httpx
import base64
import os
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/vision", tags=["视觉理解"])

# Qwen2.5-VL-3B 服务配置
QWEN_VL_SERVICE_URL = "http://127.0.0.1:8910"
UPLOAD_DIR = Path("./data/uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class VisionChatMessage(BaseModel):
    """视觉对话消息"""
    role: str = Field(..., description="角色: user|assistant|system")
    content: str = Field(..., description="消息内容")
    image_url: Optional[str] = Field(None, description="图片URL(可选)")


class VisionChatRequest(BaseModel):
    """视觉对话请求"""
    query: str = Field(..., description="用户查询")
    image_path: Optional[str] = Field(None, description="图片路径(可选)")
    conversation_history: List[VisionChatMessage] = Field(default_factory=list, description="对话历史")


class VisionChatResponse(BaseModel):
    """视觉对话响应"""
    response: str
    image_path: Optional[str] = None
    model: str = "qwen2.5-vl-3b"


class ImageUploadResponse(BaseModel):
    """图片上传响应"""
    success: bool
    image_path: str
    image_url: str
    filename: str


async def call_qwen_vl_service(
    prompt: str,
    image_path: Optional[str] = None,
    conversation_history: Optional[List[Dict]] = None
) -> str:
    """
    调用 Qwen2.5-VL-3B 服务 (Genie VL 特殊格式)
    
    参数:
        prompt: 文本提示
        image_path: 图片路径(可选)
        conversation_history: 对话历史(可选)
    
    返回:
        模型响应文本
    """
    try:
        # Genie VL 模型需要特殊的请求格式
        # 参考: https://www.aidevhome.com/?id=55
        
        if image_path and os.path.exists(image_path):
            # ========== VL (图文) 模式 ==========
            # 使用 OpenAI 视觉格式 (与 GenieAPIClientVision.py 一致)
            # 读取图片并转换为 base64
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            # 根据文件扩展名推断 MIME 类型
            ext = os.path.splitext(image_path)[1].lower()
            mime_map = {'.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.gif': 'gif', '.bmp': 'bmp', '.webp': 'webp'}
            mime_type = mime_map.get(ext, 'jpeg')
            
            logger.info(f"[VisionRoutes] VL模式 - 图片: {image_path} ({mime_type})")
            
            # 构建 OpenAI 视觉格式的 messages
            vl_messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/{mime_type};base64,{image_data}"
                            }
                        }
                    ]
                }
            ]
            
            # 添加对话历史（如果有）
            if conversation_history:
                vl_messages = conversation_history + vl_messages
            
            # 构建请求数据（extra_body 字段需平铺到顶层，与 OpenAI SDK 行为一致）
            request_data = {
                "model": "qwen2.5vl3b-8380-2.42",
                "messages": vl_messages,
                "size": 2048,
                "seed": 42,
                "temp": 0.7,
                "top_k": 1,
                "top_p": 1.0
            }
        else:
            # ========== LLM (纯文本) 模式 ==========
            logger.info(f"[VisionRoutes] LLM模式 - 纯文本")
            
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
            
            # 添加对话历史
            if conversation_history:
                messages = [messages[0]] + conversation_history + [messages[1]]
            
            # 构建请求数据（extra_body 字段需平铺到顶层，与 OpenAI SDK 行为一致）
            request_data = {
                "model": "qwen2.5vl3b-8380-2.42",
                "messages": messages,
                "size": 2048,
                "seed": 42,
                "temp": 0.7,
                "top_k": 1,
                "top_p": 1.0
            }
        
        logger.info(f"[VisionRoutes] 调用 Qwen VL 服务: {QWEN_VL_SERVICE_URL}")
        logger.debug(f"[VisionRoutes] 请求数据: {request_data}")
        
        # 调用服务（禁用系统代理，避免被代理拦截本地请求）
        async with httpx.AsyncClient(timeout=60.0, proxy=None) as client:
            response = await client.post(
                f"{QWEN_VL_SERVICE_URL}/v1/chat/completions",
                json=request_data
            )
            response.raise_for_status()
            
            result = response.json()
            logger.debug(f"[VisionRoutes] 响应数据: {result}")
            
            # 解析响应
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            elif "response" in result:
                return result["response"]
            else:
                logger.error(f"[VisionRoutes] 未知响应格式: {result}")
                return "抱歉,模型返回了未知格式的响应。"
    
    except httpx.TimeoutException:
        logger.error("[VisionRoutes] Qwen VL 服务超时")
        raise HTTPException(status_code=504, detail="视觉模型服务超时,请稍后重试")
    except httpx.HTTPStatusError as e:
        logger.error(f"[VisionRoutes] Qwen VL 服务错误: {e}")
        # 如果是500错误（模型加载失败），返回友好提示
        if e.response.status_code == 500:
            logger.warning("[VisionRoutes] 视觉服务不可用，返回降级响应")
            return "抱歉，视觉理解功能暂时维护中。您可以继续使用文本对话功能，我会尽力帮助您！"
        
        error_detail = f"视觉模型服务错误: {str(e)}"
        try:
            error_body = e.response.json()
            if "error" in error_body:
                error_detail = f"视觉模型错误: {error_body['error']}"
        except:
            pass
        raise HTTPException(status_code=502, detail=error_detail)
    except Exception as e:
        logger.error(f"[VisionRoutes] 调用失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"调用视觉模型失败: {str(e)}")


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """
    上传图片
    
    支持的格式: JPG, JPEG, PNG, BMP, GIF
    最大大小: 10MB
    """
    logger.info(f"[VisionRoutes] 收到图片上传: {file.filename}")
    
    try:
        # 验证文件类型
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的图片格式: {file.content_type}. 支持: JPG, PNG, BMP, GIF"
            )
        
        # 验证文件大小 (10MB)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="图片大小超过10MB限制"
            )
        
        # 生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = os.path.splitext(file.filename)[1]
        filename = f"image_{timestamp}{ext}"
        file_path = UPLOAD_DIR / filename
        
        # 保存文件
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"[VisionRoutes] 图片已保存: {file_path}")
        
        return ImageUploadResponse(
            success=True,
            image_path=str(file_path),
            image_url=f"/api/vision/images/{filename}",
            filename=filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VisionRoutes] 上传失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"上传图片失败: {str(e)}")


@router.post("/chat", response_model=VisionChatResponse)
async def vision_chat(request: VisionChatRequest):
    """
    视觉对话接口
    
    支持:
    - 纯文本对话
    - 图片理解
    - 图文混合对话
    """
    logger.info(f"[VisionRoutes] 收到视觉对话请求: {request.query[:50]}...")
    
    try:
        # 构建对话历史
        history = []
        for msg in request.conversation_history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # 调用 Qwen VL 服务
        response_text = await call_qwen_vl_service(
            prompt=request.query,
            image_path=request.image_path,
            conversation_history=history if history else None
        )
        
        logger.info(f"[VisionRoutes] 视觉对话完成: {len(response_text)} 字符")
        
        return VisionChatResponse(
            response=response_text,
            image_path=request.image_path,
            model="qwen2.5-vl-3b"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VisionRoutes] 视觉对话失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"视觉对话失败: {str(e)}")


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form(default="请详细描述这张图片的内容")
):
    """
    图片分析接口 - 接收文件上传
    
    参数:
        file: 上传的图片文件
        question: 分析问题(可选,默认为通用描述)
    """
    logger.info(f"[VisionRoutes] 收到图片分析请求: {file.filename}")
    
    try:
        # 验证文件类型
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/gif"]
        if file.content_type not in allowed_types:
            return {
                "success": False,
                "error": f"不支持的图片格式: {file.content_type}"
            }
        
        # 验证文件大小 (10MB)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            return {
                "success": False,
                "error": "图片大小超过10MB限制"
            }
        
        # 保存文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_str = file.filename or "image.jpg"
        ext = os.path.splitext(filename_str)[1]
        filename = f"analyze_{timestamp}{ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"[VisionRoutes] 图片已保存: {file_path}")
        
        # 调用 Qwen VL 服务
        response_text = await call_qwen_vl_service(
            prompt=question,
            image_path=str(file_path)
        )
        
        logger.info(f"[VisionRoutes] 图片分析完成")
        
        return {
            "success": True,
            "result": response_text,
            "analysis": response_text,
            "description": response_text,
            "image_path": str(file_path),
            "model": "qwen2.5-vl-3b"
        }
    
    except Exception as e:
        logger.error(f"[VisionRoutes] 图片分析失败: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/health")
async def health_check():
    """
    视觉服务健康检查
    """
    try:
        # 检查 Qwen VL 服务是否可用（使用 /v1/models 端点，禁用代理）
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get(f"{QWEN_VL_SERVICE_URL}/v1/models")
            service_available = response.status_code == 200
        
        return {
            "status": "healthy" if service_available else "degraded",
            "qwen_vl_service": QWEN_VL_SERVICE_URL,
            "service_available": service_available,
            "upload_dir": str(UPLOAD_DIR)
        }
    except Exception as e:
        logger.error(f"[VisionRoutes] 健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "qwen_vl_service": QWEN_VL_SERVICE_URL,
            "service_available": False,
            "error": str(e)
        }


@router.get("/images/{filename}")
async def get_image(filename: str):
    """
    获取上传的图片
    """
    from fastapi.responses import FileResponse
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图片不存在")
    
    return FileResponse(file_path)
