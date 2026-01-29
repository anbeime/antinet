#!/usr/bin/env python3
# backend/routes/chat_routes.py - 知识库聊天路由（修复版 - 从数据库读取）
"""
提供知识库查询和对话机器人功能（从数据库读取知识卡片）
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
from database import DatabaseManager
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["聊天机器人"])

# 创建数据库管理器实例
db_manager = DatabaseManager(settings.DB_PATH)


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="角色: user|assistant|system")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """聊天请求"""
    query: str = Field(..., description="用户查询")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="对话历史")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")


class CardSource(BaseModel):
    """知识来源"""
    card_id: str
    card_type: str
    title: str
    similarity: float


class ChatResponse(BaseModel):
    """聊天响应"""
    response: str
    sources: List[CardSource] = Field(default_factory=list)
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list, description="推荐的相关问题")


class CardSearchRequest(BaseModel):
    """卡片搜索请求"""
    query: str
    card_type: Optional[str] = None
    limit: int = 10


class CardSearchResponse(BaseModel):
    """卡片搜索响应"""
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0


def _search_cards_from_database(query: str, limit: int = 10, card_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    从数据库搜索知识卡片

    参数：
        query: 查询关键词
        limit: 返回数量限制
        card_type: 卡片类型过滤（可选）

    返回：
        匹配的卡片列表
    """
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        query_lower = query.lower()
        
        # 构建SQL查询
        sql = """
            SELECT id, card_type, title, content, category, created_at
            FROM knowledge_cards
            WHERE (LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(category) LIKE ?)
        """
        params = [f'%{query_lower}%', f'%{query_lower}%', f'%{query_lower}%']
        
        # 如果指定了卡片类型，添加过滤条件
        if card_type:
            sql += " AND card_type = ?"
            params.append(card_type)
        
        sql += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        # 转换为字典列表
        cards = []
        for row in rows:
            card = {
                'card_id': f"db_{row[0]}",
                'card_type': row[1] or 'blue',
                'title': row[2] or '无标题',
                'content': {
                    'description': row[3] or '无内容'
                },
                'category': row[4] or '未分类',
                'created_at': row[5],
                'similarity': 0.85  # 简单相似度评分
            }
            cards.append(card)
        
        conn.close()
        logger.info(f"从数据库搜索到 {len(cards)} 张卡片")
        return cards
        
    except Exception as e:
        logger.error(f"数据库搜索失败: {e}", exc_info=True)
        return []


def _generate_response(query: str, relevant_cards: List[Dict]) -> str:
    """
    生成回复（基于检索到的卡片）

    参数：
        query: 用户查询
        relevant_cards: 相关卡片

    返回：
        回复内容
    """
    try:
        if not relevant_cards:
            return "抱歉，我没有找到与您的问题相关的知识卡片。您可以尝试换个问法，或者联系管理员添加相关知识。\n\n我可以帮助您解答关于Antinet系统功能、团队协作、知识管理等方面的问题。"

        # 根据卡片类型构建回复
        blue_cards = [c for c in relevant_cards if c.get("card_type") == "blue"]
        green_cards = [c for c in relevant_cards if c.get("card_type") == "green"]
        yellow_cards = [c for c in relevant_cards if c.get("card_type") == "yellow"]
        red_cards = [c for c in relevant_cards if c.get("card_type") == "red"]

        response_parts = []

        # 蓝色卡片：事实
        if blue_cards:
            response_parts.append("📊 **相关事实：**\n")
            for card in blue_cards[:3]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                desc = content.get("description", "无描述") if isinstance(content, dict) else str(content)
                response_parts.append(f"- {title}\n  {desc}\n")

        # 绿色卡片：解释
        if green_cards:
            response_parts.append("\n💡 **原因解释：**\n")
            for card in green_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                explanation = content.get("description", "无解释") if isinstance(content, dict) else str(content)
                response_parts.append(f"- {title}\n  {explanation}\n")

        # 黄色卡片：风险
        if yellow_cards:
            response_parts.append("\n⚠️ **相关风险：**\n")
            for card in yellow_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                desc = content.get("description", "无描述") if isinstance(content, dict) else str(content)
                response_parts.append(f"- {title}\n  {desc}\n")

        # 红色卡片：行动建议
        if red_cards:
            response_parts.append("\n🎯 **行动建议：**\n")
            for card in red_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                action = content.get("description", "无行动") if isinstance(content, dict) else str(content)
                response_parts.append(f"- {title}\n  {action}\n")

        # 总结
        response_parts.append(f"\n📚 **来源说明：**\n基于知识库中找到的 {len(relevant_cards)} 张相关卡片生成（从数据库读取）。")

        return "\n".join(response_parts)

    except Exception as e:
        logger.error(f"生成回复失败: {e}", exc_info=True)
        return "抱歉，生成回复时出现了错误。"


def _generate_suggested_questions(query: str, relevant_cards: List[Dict]) -> List[str]:
    """
    根据查询和相关卡片生成推荐问题
    
    参数:
        query: 用户查询
        relevant_cards: 相关卡片
        
    返回:
        推荐问题列表（最多3个）
    """
    suggestions = []
    
    # 基于查询关键词的推荐问题映射
    keyword_questions = {
        "系统": [
            "Antinet系统有哪些核心功能？",
            "如何启动Antinet系统？",
            "系统的技术架构是怎样的？"
        ],
        "NPU": [
            "NPU推理性能如何优化？",
            "如何验证NPU是否正常工作？",
            "NPU和CPU的性能差异有多大？"
        ],
        "卡片": [
            "四色卡片分别代表什么含义？",
            "如何创建和管理知识卡片？",
            "卡片系统的设计理念是什么？"
        ],
        "团队": [
            "如何进行团队协作？",
            "团队成员如何共享知识？",
            "协作活动如何记录和查看？"
        ],
        "数据": [
            "数据如何保证安全性？",
            "支持哪些数据格式？",
            "如何进行数据分析？"
        ]
    }
    
    # 基于卡片类型的推荐问题
    card_type_questions = {
        "blue": [
            "还有哪些相关的事实信息？",
            "这个功能的具体参数是什么？"
        ],
        "green": [
            "为什么要这样设计？",
            "有没有其他实现方式？"
        ],
        "yellow": [
            "如何避免这些风险？",
            "遇到问题如何排查？"
        ],
        "red": [
            "具体操作步骤是什么？",
            "有没有快捷方式？"
        ]
    }
    
    # 1. 根据查询关键词推荐
    query_lower = query.lower()
    for keyword, questions in keyword_questions.items():
        if keyword in query_lower or keyword in query:
            suggestions.extend(questions)
            break
    
    # 2. 根据相关卡片类型推荐
    if relevant_cards:
        card_types = [c.get("card_type") for c in relevant_cards[:3]]
        most_common_type = max(set(card_types), key=card_types.count) if card_types else None
        if most_common_type and most_common_type in card_type_questions:
            suggestions.extend(card_type_questions[most_common_type])
    
    # 3. 通用推荐问题（兜底）
    if not suggestions:
        suggestions = [
            "Antinet系统有哪些核心功能？",
            "如何快速上手使用系统？",
            "系统支持哪些数据分析功能？"
        ]
    
    # 去重并返回前3个
    unique_suggestions = []
    for q in suggestions:
        if q not in unique_suggestions:
            unique_suggestions.append(q)
        if len(unique_suggestions) >= 3:
            break
    
    return unique_suggestions


@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    知识库查询接口（从数据库读取）

    接收用户查询，返回基于知识库的回复
    """
    logger.info(f"[ChatRoutes] 收到查询: {request.query}")

    try:
        # 从数据库搜索知识卡片
        cards = _search_cards_from_database(request.query, limit=10)

        # 生成回复
        response = _generate_response(request.query, cards)
        
        # 生成推荐问题
        suggested_questions = _generate_suggested_questions(request.query, cards)

        # 构建响应
        result = ChatResponse(
            response=response,
            sources=[
                CardSource(
                    card_id=card["card_id"],
                    card_type=card["card_type"],
                    title=card["title"],
                    similarity=card.get("similarity", 0.85)
                )
                for card in cards[:5]
            ],
            cards=cards[:10],
            suggested_questions=suggested_questions
        )

        logger.info(f"[ChatRoutes] 查询完成: {len(cards)}条相关卡片, {len(suggested_questions)}个推荐问题")
        return result

    except Exception as e:
        logger.error(f"[ChatRoutes] 查询失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=CardSearchResponse)
async def search_cards(request: CardSearchRequest):
    """
    卡片搜索接口（从数据库读取）

    搜索知识库中的卡片
    """
    logger.info(f"[ChatRoutes] 搜索卡片: {request.query} (类型: {request.card_type})")

    try:
        # 从数据库搜索
        cards = _search_cards_from_database(
            request.query, 
            limit=request.limit,
            card_type=request.card_type
        )

        result = CardSearchResponse(
            cards=cards,
            total=len(cards)
        )

        logger.info(f"[ChatRoutes] 搜索完成: {len(cards)}条结果")
        return result

    except Exception as e:
        logger.error(f"[ChatRoutes] 搜索失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cards")
async def list_cards(
    card_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    列出知识卡片（从数据库读取）

    参数：
        card_type: 卡片类型过滤（可选）
        limit: 返回数量限制（默认50）
        offset: 偏移量（默认0）
    """
    logger.info(f"[ChatRoutes] 列出卡片 (类型: {card_type}, 限制: {limit})")

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 构建SQL查询
        sql = "SELECT id, type, title, content, category, created_at FROM knowledge_cards WHERE 1=1"
        params = []
        
        if card_type:
            sql += " AND card_type = ?"
            params.append(card_type)
        
        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        # 获取总数
        count_sql = "SELECT COUNT(*) FROM knowledge_cards WHERE 1=1"
        count_params = []
        if card_type:
            count_sql += " AND card_type = ?"
            count_params.append(card_type)
        cursor.execute(count_sql, count_params)
        total = cursor.fetchone()[0]
        
        # 转换为字典列表
        cards = []
        for row in rows:
            card = {
                'card_id': f"db_{row[0]}",
                'card_type': row[1] or 'blue',
                'title': row[2] or '无标题',
                'content': {
                    'description': row[3] or '无内容'
                },
                'category': row[4] or '未分类',
                'created_at': row[5]
            }
            cards.append(card)
        
        conn.close()

        return {
            "cards": cards,
            "total": total
        }

    except Exception as e:
        logger.error(f"[ChatRoutes] 列出卡片失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/card/{card_id}")
async def get_card(card_id: str):
    """
    获取单个卡片详情（从数据库读取）

    参数：
        card_id: 卡片ID（格式：db_数字）

    返回：
        卡片详情
    """
    logger.info(f"[ChatRoutes] 获取卡片: {card_id}")

    try:
        # 解析卡片ID
        if card_id.startswith("db_"):
            db_id = int(card_id.replace("db_", ""))
        else:
            db_id = int(card_id)
        
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, type, title, content, category, created_at FROM knowledge_cards WHERE id = ?",
            (db_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"卡片不存在: {card_id}"
            )
        
        card = {
            'card_id': f"db_{row[0]}",
            'card_type': row[1] or 'blue',
            'title': row[2] or '无标题',
            'content': {
                'description': row[3] or '无内容'
            },
            'category': row[4] or '未分类',
            'created_at': row[5]
        }
        
        return card

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ChatRoutes] 获取卡片失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    聊天机器人健康检查

    返回：
        服务状态
    """
    try:
        # 检查数据库连接
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        card_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "database_initialized": True,
            "card_count": card_count,
            "search_type": "database_search"  # 使用数据库搜索
        }
    except Exception as e:
        logger.error(f"[ChatRoutes] 健康检查失败: {e}", exc_info=True)
        return {
            "status": "degraded",
            "database_initialized": False,
            "error": str(e)
        }
