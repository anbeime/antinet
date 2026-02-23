#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版聊天服务器 - 连接真实数据库
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
import sqlite3
import re
import httpx
import base64
from datetime import datetime
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建应用
app = FastAPI(
    title="聊天服务器(数据库版)",
    version="2.0.0",
    description="连接真实数据库的聊天服务"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据库路径
DB_PATH = Path("data/antinet.db")
if not DB_PATH.exists():
    DB_PATH = Path("backend/data/antinet.db")
if not DB_PATH.exists():
    DB_PATH = Path("../data/antinet.db")

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


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def search_cards(query: str, limit: int = 5) -> List[Dict]:
    """搜索知识库卡片"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 提取关键词
        keywords = extract_keywords(query)
        
        if not keywords:
            cursor.execute("""
                SELECT id, title, content, card_type, category, created_at
                FROM knowledge_cards
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
        else:
            conditions = []
            params = []
            
            for keyword in keywords:
                conditions.append("(title LIKE ? OR content LIKE ?)")
                params.extend([f"%{keyword}%", f"%{keyword}%"])
            
            where_clause = " OR ".join(conditions)
            
            cursor.execute(f"""
                SELECT id, title, content, card_type, category, created_at
                FROM knowledge_cards
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ?
            """, params + [limit])
        
        cards = []
        for row in cursor.fetchall():
            cards.append({
                "id": row["id"],
                "title": row["title"],
                "content": row["content"][:300] + "..." if row["content"] and len(row["content"]) > 300 else row["content"],
                "card_type": row["card_type"],
                "category": row["category"],
                "created_at": row["created_at"]
            })
        
        conn.close()
        return cards
        
    except Exception as e:
        logger.error(f"搜索卡片失败: {e}")
        return []


def extract_keywords(query: str) -> List[str]:
    """提取查询关键词"""
    stop_words = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '怎么', '哪里', '搜索', '查找', '查询', '关于', '相关'}
    
    words = []
    for word in re.findall(r'[\u4e00-\u9fa5]+', query):
        if len(word) >= 2 and word not in stop_words:
            words.append(word)
    
    for word in re.findall(r'[a-zA-Z]+', query):
        if len(word) >= 2:
            words.append(word.lower())
    
    return words[:5]


def get_card_type_name(card_type: str) -> str:
    """获取卡片类型名称"""
    type_map = {
        'blue': '🔵 事实',
        'green': '🟢 解释',
        'yellow': '🟡 风险',
        'red': '🔴 行动',
        'fact': '🔵 事实',
        'explanation': '🟢 解释',
        'risk': '🟡 风险',
        'action': '🔴 行动'
    }
    return type_map.get(card_type, f'⚪ {card_type}')


def detect_scene(query: str) -> str:
    """检测查询场景"""
    query_lower = query.lower()
    
    if any(kw in query for kw in ['卡片', '知识', '搜索', '查找', '查询']):
        return 'card_search'
    
    if any(kw in query for kw in ['图片', '分析', '识别', '看图']):
        return 'image_analysis'
    
    if any(kw in query for kw in ['ppt', '幻灯片', '演示文稿']):
        return 'skill_ppt'
    
    if any(kw in query for kw in ['excel', '表格', '数据分析']):
        return 'skill_excel'
    
    return 'general'


@app.get("/")
async def root():
    return {
        "message": "聊天服务器(数据库版)运行中",
        "version": "2.0.0",
        "database": str(DB_PATH),
        "database_exists": DB_PATH.exists()
    }


@app.get("/api/chat/simple/health")
async def health_check():
    """健康检查"""
    db_status = False
    card_count = 0
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        card_count = cursor.fetchone()[0]
        conn.close()
        db_status = True
    except Exception as e:
        logger.error(f"数据库检查失败: {e}")
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "database": {
            "connected": db_status,
            "path": str(DB_PATH),
            "card_count": card_count
        },
        "services": {
            "chat": True,
            "image_analysis": True,
            "card_search": db_status
        }
    }


@app.post("/api/chat/query")
async def chat_query(request: ChatRequest):
    """聊天查询接口 - 兼容前端调用"""
    result = await chat_with_db(request)
    return result


@app.post("/api/chat/simple/chat", response_model=ChatResponse)
async def chat_with_db(request: ChatRequest):
    """聊天接口 - 连接真实数据库"""
    try:
        query = request.query
        has_image = request.image_data is not None
        
        logger.info(f"收到请求: query={query[:50]}..., has_image={has_image}")
        
        scene_type = detect_scene(query)
        
        if scene_type == 'card_search':
            cards = search_cards(query)
            
            if cards:
                response_text = f"🔍 **找到 {len(cards)} 张相关卡片:**\n\n"
                for i, card in enumerate(cards[:3], 1):
                    type_name = get_card_type_name(card['card_type'])
                    response_text += f"{i}. **{card['title']}** {type_name}\n"
                    response_text += f"   {card['content'][:150]}...\n\n"
                
                if len(cards) > 3:
                    response_text += f"*还有 {len(cards) - 3} 张相关卡片...*"
            else:
                response_text = """🔍 **搜索结果**

抱歉,在知识库中没有找到匹配的卡片。

**建议:**
• 尝试使用不同的关键词
• 检查拼写是否正确
• 使用更通用的词汇

您也可以创建新的知识卡片来补充知识库。"""
            
            return ChatResponse(
                response=response_text,
                scene_type=scene_type,
                cards=cards,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "query": query,
                    "card_count": len(cards)
                }
            )
        
        elif scene_type == 'image_analysis':
            if has_image:
                response_text = """📷 **图片分析**

✅ 图片已成功接收!

**注意:** 详细的视觉分析需要配置 AI 模型服务。
当前版本支持图片接收和基础信息提取。"""
            else:
                response_text = """🖼️ **图片分析模式**

请上传图片,我将为您:
• 识别图片内容
• 提取关键信息
• 生成知识卡片

支持格式: JPG, PNG, GIF (最大 10MB)"""
        
        elif scene_type == 'skill_ppt':
            response_text = """📊 **PPT 生成服务**

我可以帮您生成专业的 PowerPoint 演示文稿。

**请告诉我:**
• 演示主题
• 目标受众
• 页数要求
• 风格偏好(商务/学术/创意)

**注意:** PPT 生成功能需要配置技能服务。"""
        
        elif scene_type == 'skill_excel':
            response_text = """📈 **Excel 分析服务**

我可以帮您分析 Excel 数据:
• 数据统计分析
• 趋势识别
• 可视化图表
• 报告生成

**请上传 Excel 文件进行分析。**

**注意:** Excel 分析功能需要配置技能服务。"""
        
        else:
            cards = search_cards(query, limit=3)
            
            if cards:
                response_text = f"💬 **关于'{query}'**\n\n我在知识库中找到一些相关信息:\n\n"
                for card in cards[:2]:
                    type_name = get_card_type_name(card['card_type'])
                    response_text += f"• **{card['title']}** {type_name}\n  {card['content'][:100]}...\n\n"
                
                response_text += "需要我基于这些知识为您生成文档或进一步分析吗?"
            else:
                response_text = f"""💬 收到: '{query}'

您好!我是知易智能助手。

我可以帮您:
📚 **查询知识库** - 搜索事实、解释、风险、行动卡片
🖼️ **分析图片** - 上传图片进行智能分析
📊 **生成文档** - PPT/Excel/Word 生成

请告诉我具体需求!"""
        
        return ChatResponse(
            response=response_text,
            scene_type=scene_type,
            cards=cards if 'cards' in locals() else [],
            metadata={
                "timestamp": datetime.now().isoformat(),
                "has_image": has_image,
                "session_id": request.session_id or f"session_{datetime.now().timestamp()}"
            }
        )
        
    except Exception as e:
        logger.error(f"聊天处理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Qwen VL 服务配置
QWEN_VL_SERVICE_URL = "http://127.0.0.1:8910"


@app.post("/api/vision/analyze")
async def vision_analyze_proxy(file: UploadFile = File(...)):
    """代理视觉分析请求到 Qwen VL 服务"""
    try:
        logger.info(f"收到视觉分析请求: {file.filename}")
        
        if not file.content_type or not file.content_type.startswith("image/"):
            return {"success": False, "error": "请上传图片文件"}
        
        # 保存上传的文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
        
        content = await file.read()
        
        if len(content) > 10 * 1024 * 1024:
            return {"success": False, "error": "图片大小不能超过 10MB"}
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"图片已保存: {file_path}, 开始调用视觉服务...")
        
        # 调用视觉服务
        vision_result = await call_vision_service(str(file_path))
        
        return vision_result
        
    except Exception as e:
        logger.error(f"视觉分析失败: {e}")
        return {"success": False, "error": str(e)}


async def call_vision_service(image_path: str, prompt: str = "描述这张图片的内容") -> Dict[str, Any]:
    """调用视觉分析服务 - 使用 Genie VL 格式"""
    try:
        # 读取图片并转为 base64
        with open(image_path, "rb") as f:
            image_base64 = base64.b64encode(f.read()).decode()
        
        # Genie VL 模型需要特殊的请求格式
        # 参考: https://www.aidevhome.com/?id=55
        vl_messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                    {"type": "text", "text": prompt}
                ]
            }
        ]
        
        request_data = {
            "model": "qwen2.5vl3b-8380-2.42",
            "messages": [{"role": "user", "content": "placeholder"}],  # 占位符
            "extra_body": {
                "messages": vl_messages,  # 真实数据放在extra_body中
                "size": 4096,
                "temp": 0.7,
                "top_k": 1,
                "top_p": 0.9
            }
        }
        
        logger.info(f"调用 Qwen VL 服务: {QWEN_VL_SERVICE_URL}")
        
        # 调用服务
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{QWEN_VL_SERVICE_URL}/v1/chat/completions",
                json=request_data
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"视觉服务响应: {result}")
            
            # 解析响应
            if "choices" in result and len(result["choices"]) > 0:
                analysis_text = result["choices"][0].get("message", {}).get("content", "")
                
                return {
                    "success": True,
                    "description": analysis_text,
                    "facts": extract_facts_from_analysis(analysis_text),
                    "insights": extract_insights_from_analysis(analysis_text)
                }
            else:
                return {
                    "success": False,
                    "error": "视觉服务返回格式错误"
                }
                
    except Exception as e:
        logger.error(f"视觉服务调用失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def extract_facts_from_analysis(text: str) -> List[str]:
    """从分析文本中提取事实"""
    facts = []
    # 简单提取：按句号分割，取前3-5句作为事实
    sentences = [s.strip() for s in text.split("。") if len(s.strip()) > 10]
    for sentence in sentences[:5]:
        if any(keyword in sentence for keyword in ["是", "有", "包含", "显示", "可以", "用于"]):
            facts.append(f"• {sentence}")
    return facts[:4] if facts else ["• 图片内容已分析"]


def extract_insights_from_analysis(text: str) -> List[str]:
    """从分析文本中提取洞察"""
    insights = []
    # 提取可能包含洞察的句子
    sentences = [s.strip() for s in text.split("。") if len(s.strip()) > 10]
    for sentence in sentences:
        if any(keyword in sentence for keyword in ["可能", "建议", "可以", "应该", "适合", "用于"]):
            insights.append(f"💡 {sentence}")
    return insights[:3] if insights else ["💡 基于图片内容进行分析"]


@app.post("/api/chat/simple/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """图片分析接口 - 真正调用 AI 模型"""
    try:
        logger.info(f"收到图片: {file.filename}")
        
        if not file.content_type or not file.content_type.startswith("image/"):
            return ImageAnalysisResponse(
                success=False,
                error="请上传图片文件"
            )
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
        
        content = await file.read()
        
        if len(content) > 10 * 1024 * 1024:
            return ImageAnalysisResponse(
                success=False,
                error="图片大小不能超过 10MB"
            )
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"图片已保存: {file_path}, 开始分析...")
        
        # 调用视觉服务进行真实分析
        vision_result = await call_vision_service(str(file_path))
        
        if vision_result["success"]:
            return ImageAnalysisResponse(
                success=True,
                description=vision_result["description"],
                facts=vision_result["facts"],
                insights=vision_result["insights"]
            )
        else:
            # 如果视觉服务失败，返回基础信息
            return ImageAnalysisResponse(
                success=True,
                description=f"图片已接收，但视觉分析服务暂时不可用\n\n文件名: {file.filename}\n大小: {len(content) / 1024:.1f} KB",
                facts=["✅ 图片上传成功"],
                insights=[f"⚠️ 分析服务错误: {vision_result.get('error', '未知错误')}"]
            )
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
        return ImageAnalysisResponse(
            success=False,
            error=f"处理失败: {str(e)}"
        )
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
        return ImageAnalysisResponse(
            success=False,
            error=f"处理失败: {str(e)}"
        )


@app.get("/api/cards")
async def get_all_cards(limit: int = 10):
    """获取所有卡片(调试用)"""
    try:
        cards = search_cards("", limit=limit)
        return {
            "count": len(cards),
            "cards": cards
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("  聊天服务器(数据库版)启动")
    print("=" * 60)
    print(f"\n数据库路径: {DB_PATH}")
    print(f"数据库存在: {DB_PATH.exists()}")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        count = cursor.fetchone()[0]
        conn.close()
        print(f"知识卡片数量: {count}")
    except Exception as e:
        print(f"数据库连接失败: {e}")
    
    print("\nAPI 端点:")
    print("  • GET  /api/chat/simple/health     - 健康检查")
    print("  • POST /api/chat/simple/chat       - 聊天接口")
    print("  • POST /api/chat/simple/analyze-image - 图片分析")
    print("  • GET  /api/cards                  - 获取所有卡片")
    print("\n访问: http://localhost:8002")
    print("=" * 60)
    
    uvicorn.run(
        "chat_server_with_db:app",
        host="0.0.0.0",
        port=8002,
        reload=False,
        log_level="info"
    )
