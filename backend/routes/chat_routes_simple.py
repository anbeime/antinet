#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版聊天路由 - 支持图片分析
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import os
import base64
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat/simple", tags=["简化版聊天"])


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    query: str
    image_data: Optional[str] = None
    conversation_history: List[ChatMessage] = []
    context: Dict[str, Any] = {}
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    scene_type: str = "general"
    cards: List[Dict] = []
    metadata: Dict[str, Any] = {}


class ImageAnalysisResponse(BaseModel):
    success: bool
    description: str = ""
    facts: List[str] = []
    insights: List[str] = []
    error: Optional[str] = None


# 上传目录
UPLOAD_DIR = Path("uploads/temp")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/chat", response_model=ChatResponse)
async def simple_chat(request: ChatRequest):
    """简化版聊天接口"""
    try:
        query = request.query
        has_image = request.image_data is not None
        
        # 检测场景
        scene_type = "general"
        if has_image or "图片" in query or "分析" in query:
            scene_type = "image_analysis"
        elif "卡片" in query or "搜索" in query:
            scene_type = "card_search"
        
        # 生成响应
        if scene_type == "image_analysis" and has_image:
            response_text = """📷 **图片分析结果**

我收到了您的图片，正在进行分析...

**注意：** 图片分析功能需要配置智能体视觉服务才能正常工作。

如果您看到这条消息，说明：
✅ 前端图片上传正常
✅ 后端接收正常
⚠️  需要配置视觉分析服务

请确保：
1. 智能体视觉服务已启动
2. NPU 模型已正确加载
3. 配置文件正确设置"""
        elif scene_type == "card_search":
            response_text = f"🔍 搜索: {query}\n\n知识库查询功能需要数据库连接。"
        else:
            response_text = f"收到消息：{query}\n\n✅ 聊天功能正常工作！\n\n当前支持：\n- 文本对话\n- 图片上传\n- 基础场景识别"
        
        return ChatResponse(
            response=response_text,
            scene_type=scene_type,
            cards=[],
            metadata={
                "timestamp": datetime.now().isoformat(),
                "has_image": has_image,
                "session_id": request.session_id
            }
        )
        
    except Exception as e:
        logger.error(f"聊天处理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """图片分析接口"""
    try:
        # 保存上传的文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"图片已保存: {file_path}")
        
        # 尝试使用智能体视觉服务分析
        try:
            # 检查是否有视觉服务
            vision_result = await analyze_with_vision_service(str(file_path))
            if vision_result:
                return ImageAnalysisResponse(
                    success=True,
                    description=vision_result.get("description", "图片分析完成"),
                    facts=vision_result.get("facts", []),
                    insights=vision_result.get("insights", [])
                )
        except Exception as e:
            logger.warning(f"视觉服务分析失败: {e}")
        
        # 返回基础分析结果
        return ImageAnalysisResponse(
            success=True,
            description=f"图片已接收: {file.filename}\n大小: {len(content) / 1024:.1f} KB\n\n基础图片接收功能正常工作。",
            facts=["图片上传成功", f"文件大小: {len(content) / 1024:.1f} KB"],
            insights=["需要配置视觉分析服务以获取详细分析结果"]
        )
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
        return ImageAnalysisResponse(
            success=False,
            error=str(e)
        )


async def analyze_with_vision_service(image_path: str) -> Optional[Dict]:
    """使用视觉服务分析图片"""
    try:
        # 尝试导入视觉服务
        from services.agent_vision_service import AgentVisionService
        
        service = AgentVisionService()
        result = await service.analyze_image(image_path)
        
        return {
            "description": result.get("description", ""),
            "facts": result.get("facts", []),
            "insights": result.get("insights", [])
        }
    except ImportError:
        logger.info("视觉服务未配置，使用基础分析")
        return None
    except Exception as e:
        logger.error(f"视觉服务调用失败: {e}")
        return None


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "chat": True,
            "image_analysis": True
        }
    }
