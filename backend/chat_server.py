#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版聊天服务器
独立运行，专门处理聊天和图片分析功能
"""

import os
import sys
from pathlib import Path

# 添加 backend 到路径
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建应用
app = FastAPI(
    title="聊天服务器",
    version="1.0.0",
    description="简化版聊天和图片分析服务"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源（开发环境）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 上传目录
UPLOAD_DIR = Path("uploads/temp")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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


@app.get("/")
async def root():
    return {"message": "聊天服务器运行中", "version": "1.0.0"}


@app.get("/api/chat/simple/health")
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


@app.post("/api/chat/simple/chat", response_model=ChatResponse)
async def simple_chat(request: ChatRequest):
    """简化版聊天接口"""
    try:
        query = request.query
        has_image = request.image_data is not None
        
        logger.info(f"收到请求: query={query[:50]}..., has_image={has_image}")
        
        # 检测场景
        scene_type = "general"
        if has_image or "图片" in query or "分析" in query:
            scene_type = "image_analysis"
        elif "卡片" in query or "搜索" in query:
            scene_type = "card_search"
        elif "ppt" in query.lower() or "幻灯片" in query:
            scene_type = "skill_ppt"
        elif "excel" in query.lower() or "表格" in query:
            scene_type = "skill_excel"
        
        # 生成响应
        if scene_type == "image_analysis" and has_image:
            response_text = """📷 **图片分析结果**

✅ 图片已成功接收并处理！

**图片信息：**
• 格式: Base64 编码
• 状态: 已接收
• 处理: 完成

**注意：** 详细视觉分析需要配置智能体视觉服务。
当前版本支持基础图片接收功能。"""
        elif scene_type == "image_analysis":
            response_text = """🖼️ **图片分析模式**

请上传图片，我将为您分析：
• 图片内容识别
• 关键信息提取
• 生成知识卡片

支持格式：JPG, PNG, GIF
最大大小：10MB"""
        elif scene_type == "card_search":
            response_text = f"""🔍 **知识库搜索**: {query}

搜索功能需要数据库连接才能返回结果。

当前支持搜索：
• 事实卡片 (蓝色)
• 解释卡片 (绿色)
• 风险卡片 (黄色)
• 行动卡片 (红色)"""
        elif scene_type == "skill_ppt":
            response_text = """📊 **PPT 生成服务**

我将为您生成专业的 PowerPoint 演示文稿。

请告诉我：
• 演示主题
• 页数要求
• 风格偏好"""
        elif scene_type == "skill_excel":
            response_text = """📈 **Excel 分析服务**

我将为您分析 Excel 数据：
• 数据统计分析
• 趋势识别
• 可视化图表生成

请上传 Excel 文件。"""
        else:
            response_text = f"""💬 收到消息："{query}"

✅ **聊天功能正常工作！**

我可以帮您：
📚 搜索知识库卡片
🖼️ 分析图片内容
📊 生成 PPT/Excel/Word 文档

请直接告诉我您的需求！"""
        
        return ChatResponse(
            response=response_text,
            scene_type=scene_type,
            cards=[],
            metadata={
                "timestamp": datetime.now().isoformat(),
                "has_image": has_image,
                "session_id": request.session_id or f"session_{datetime.now().timestamp()}"
            }
        )
        
    except Exception as e:
        logger.error(f"聊天处理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/simple/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """图片分析接口"""
    try:
        logger.info(f"收到图片: {file.filename}, content_type={file.content_type}")
        
        # 验证文件类型
        if not file.content_type or not file.content_type.startswith("image/"):
            return ImageAnalysisResponse(
                success=False,
                error="请上传图片文件"
            )
        
        # 保存上传的文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
        
        content = await file.read()
        
        # 验证文件大小（10MB）
        if len(content) > 10 * 1024 * 1024:
            return ImageAnalysisResponse(
                success=False,
                error="图片大小不能超过 10MB"
            )
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"图片已保存: {file_path}, 大小: {len(content)} bytes")
        
        # 返回分析结果
        return ImageAnalysisResponse(
            success=True,
            description=f"图片已成功接收并保存\n\n文件名: {file.filename}\n大小: {len(content) / 1024:.1f} KB\n格式: {file.content_type}",
            facts=[
                "✅ 图片上传成功",
                f"📁 文件大小: {len(content) / 1024:.1f} KB",
                f"📋 文件格式: {file.content_type}",
                f"💾 保存路径: {file_path}"
            ],
            insights=[
                "💡 提示: 详细视觉分析需要配置智能体视觉服务",
                "💡 当前版本支持基础图片接收和保存功能"
            ]
        )
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
        return ImageAnalysisResponse(
            success=False,
            error=f"处理失败: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("  聊天服务器启动")
    print("=" * 60)
    print("\nAPI 端点:")
    print("  • GET  /api/chat/simple/health     - 健康检查")
    print("  • POST /api/chat/simple/chat       - 聊天接口")
    print("  • POST /api/chat/simple/analyze-image - 图片分析")
    print("\n访问: http://localhost:8001")
    print("=" * 60)
    
    uvicorn.run(
        "chat_server:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )
