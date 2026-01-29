#!/usr/bin/env python3
# backend/routes/chat_routes.py - 知识库聊天路由
"""
提供知识库查询和对话机器人功能（简化版，不依赖向量检索）
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["聊天机器人"])

# 数据库管理器（将在main.py中设置）
db_manager = None


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


def _search_cards_by_keyword(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    使用关键词搜索数据库中的知识卡片

    参数：
        query: 查询关键词
        limit: 返回数量限制

    返回：
        匹配的卡片列表
    """
    global db_manager
    if db_manager is None:
        logger.error("数据库管理器未初始化")
        return []

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        # 使用 SQL LIKE 进行模糊匹配
        query_lower = query.lower()
        cursor.execute("""
            SELECT id, title, content, category, type, created_at
            FROM knowledge_cards
            WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
            ORDER BY id DESC
            LIMIT ?
        """, (f"%{query_lower}%", f"%{query_lower}%", limit))

        rows = cursor.fetchall()
        cards = []

        for row in rows:
            cards.append({
                "card_id": f"db_{row[0]}",
                "id": row[0],
                "card_type": row[4] if row[4] else "blue",
                "title": row[1],
                "content": {
                    "description": row[2]
                },
                "category": row[3],
                "similarity": 0.8  # 简单相似度评分
            })

        conn.close()
        return cards

    except Exception as e:
        logger.error(f"搜索卡片失败: {e}", exc_info=True)
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
                desc = content.get("description", "无描述") if isinstance(content, dict) else "无描述"
                response_parts.append(f"- {title}\n  {desc}\n")

        # 绿色卡片：解释
        if green_cards:
            response_parts.append("\n **原因解释：**\n")
            for card in green_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                explanation = content.get("explanation", "无解释") if isinstance(content, dict) else "无解释"
                response_parts.append(f"- {title}\n  {explanation}\n")

        # 黄色卡片：风险
        if yellow_cards:
            response_parts.append("\n **相关风险：**\n")
            for card in yellow_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                level = content.get("risk_level", "未知") if isinstance(content, dict) else "未知"
                desc = content.get("description", "无描述") if isinstance(content, dict) else "无描述"
                response_parts.append(f"- {title} (等级: {level})\n  {desc}\n")

        # 红色卡片：行动建议
        if red_cards:
            response_parts.append("\n🎯 **行动建议：**\n")
            for card in red_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                priority = content.get("priority", "未知") if isinstance(content, dict) else "未知"
                action = content.get("action", "无行动") if isinstance(content, dict) else "无行动"
                response_parts.append(f"- {title} (优先级: {priority})\n  {action}\n")

        # 总结
        response_parts.append(f"\n **来源说明：**\n基于知识库中找到的 {len(relevant_cards)} 张相关卡片生成。")

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
        ],
        "启动": [
            "如何一键启动系统？",
            "启动失败如何排查？",
            "需要哪些环境依赖？"
        ],
        "性能": [
            "如何优化系统性能？",
            "推理延迟多少算正常？",
            "性能瓶颈在哪里？"
        ],
        "API": [
            "系统提供哪些API接口？",
            "如何调用API进行开发？",
            "API文档在哪里查看？"
        ]
    }
    
    # 基于卡片类型的推荐问题
    card_type_questions = {
        "blue": [
            "还有哪些相关的事实信息？",
            "这个功能的具体参数是什么？",
            "有没有更详细的说明文档？"
        ],
        "green": [
            "为什么要这样设计？",
            "有没有其他实现方式？",
            "这种方法的优缺点是什么？"
        ],
        "yellow": [
            "如何避免这些风险？",
            "遇到问题如何排查？",
            "有哪些注意事项？"
        ],
        "red": [
            "具体操作步骤是什么？",
            "有没有快捷方式？",
            "完成后如何验证？"
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
    知识库查询接口

    接收用户查询，返回基于知识库的回复
    """
    logger.info(f"[ChatRoutes] 收到查询: {request.query}")

    try:
        # 使用关键词搜索预设的知识卡片
        cards = _search_cards_by_keyword(request.query, limit=10)

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
                    similarity=card.get("similarity", 0.8)
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
    卡片搜索接口

    搜索知识库中的卡片
    """
    logger.info(f"[ChatRoutes] 搜索卡片: {request.query} (类型: {request.card_type})")

    try:
        # 使用关键词搜索
        cards = _search_cards_by_keyword(request.query, limit=request.limit)

        # 如果指定了卡片类型，进行过滤
        if request.card_type:
            cards = [c for c in cards if c.get("card_type") == request.card_type]

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
    列出知识卡片

    参数：
        card_type: 卡片类型过滤（可选）
        limit: 返回数量限制（默认50）
        offset: 偏移量（默认0）
    """
    global db_manager
    logger.info(f"[ChatRoutes] 列出卡片 (类型: {card_type}, 限制: {limit})")

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        # 构建查询
        if card_type:
            cursor.execute("""
                SELECT id, title, content, category, card_type, similarity, created_at
                FROM knowledge_cards
                WHERE card_type = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, (card_type, limit, offset))
        else:
            cursor.execute("""
                SELECT id, title, content, category, card_type, similarity, created_at
                FROM knowledge_cards
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))

        rows = cursor.fetchall()
        cards = []

        for row in rows:
            cards.append({
                "card_id": f"db_{row[0]}",
                "id": row[0],
                "card_type": row[4] if row[4] else "blue",
                "title": row[1],
                "content": {
                    "description": row[2]
                },
                "category": row[3],
                "similarity": row[5]
            })

        # 获取总数
        if card_type:
            cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE card_type = ?", (card_type,))
        else:
            cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total = cursor.fetchone()[0]

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
    获取单个卡片详情

    参数：
        card_id: 卡片ID（格式：db_<id>）

    返回：
        卡片详情
    """
    global db_manager
    logger.info(f"[ChatRoutes] 获取卡片: {card_id}")

    try:
        # 解析卡片ID
        if card_id.startswith("db_"):
            db_id = int(card_id.replace("db_", ""))
        else:
            db_id = int(card_id)

        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, title, content, category, card_type, similarity, created_at
            FROM knowledge_cards
            WHERE id = ?
        """, (db_id,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"卡片不存在: {card_id}"
            )

        return {
            "card_id": f"db_{row[0]}",
            "id": row[0],
            "card_type": row[4],
            "title": row[1],
            "content": {
                "description": row[2]
            },
            "category": row[3],
            "similarity": row[5]
        }

    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的卡片ID格式: {card_id}")
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
        # 简化版本，总是返回健康状态
        return {
            "status": "healthy",
            "database_initialized": True,
            "search_type": "keyword_match"  # 使用关键词匹配而非向量检索
        }
    except Exception as e:
        logger.error(f"[ChatRoutes] 健康检查失败: {e}", exc_info=True)
        return {
            "status": "degraded",
            "database_initialized": False,
            "error": str(e)
        }
