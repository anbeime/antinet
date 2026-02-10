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
    调用 Qwen2.5-VL-3B 服务
    
    参数:
        prompt: 文本提示
        image_path: 图片路径(可选)
        conversation_history: 对话历史(可选)
    
    返回:
        模型响应文本
    """
    try:
        # 构建请求数据
        request_data = {
            "prompt": prompt,
            "max_tokens": 2048,
            "temperature": 0.7,
            "top_p": 0.9,
        }
        
        # 如果有图片,添加图片路径
        if image_path and os.path.exists(image_path):
            request_data["image_path"] = image_path
            logger.info(f"[VisionRoutes] 包含图片: {image_path}")
        
        # 如果有对话历史,添加历史
        if conversation_history:
            request_data["history"] = conversation_history
        
        logger.info(f"[VisionRoutes] 调用 Qwen VL 服务: {QWEN_VL_SERVICE_URL}")
        
        # 调用服务
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{QWEN_VL_SERVICE_URL}/v1/chat/completions",
                json=request_data
            )
            response.raise_for_status()
            
            result = response.json()
            
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
        raise HTTPException(status_code=502, detail=f"视觉模型服务错误: {str(e)}")
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


@router.post("/analyze", response_model=VisionChatResponse)
async def analyze_image(
    image_path: str = Form(...),
    query: str = Form(default="请详细描述这张图片的内容")
):
    """
    图片分析接口
    
    参数:
        image_path: 图片路径
        query: 分析问题(可选,默认为通用描述)
    """
    logger.info(f"[VisionRoutes] 收到图片分析请求: {image_path}")
    
    try:
        # 验证图片存在
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="图片不存在")
        
        # 调用 Qwen VL 服务
        response_text = await call_qwen_vl_service(
            prompt=query,
            image_path=image_path
        )
        
        logger.info(f"[VisionRoutes] 图片分析完成")
        
        return VisionChatResponse(
            response=response_text,
            image_path=image_path,
            model="qwen2.5-vl-3b"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VisionRoutes] 图片分析失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"图片分析失败: {str(e)}")


@router.get("/health")
async def health_check():
    """
    视觉服务健康检查
    """
    try:
        # 检查 Qwen VL 服务是否可用（使用 /v1/models 端点）
        async with httpx.AsyncClient(timeout=5.0) as client:
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
