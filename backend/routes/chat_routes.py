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


class CardSearchRequest(BaseModel):
    """卡片搜索请求"""
    query: str
    card_type: Optional[str] = None
    limit: int = 10


class CardSearchResponse(BaseModel):
    """卡片搜索响应"""
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0


# 预设的四色卡片知识库（模拟数据）
PRESET_KNOWLEDGE_CARDS = {
    "blue": [  # 事实卡片
        {
            "card_id": "fact_001",
            "card_type": "blue",
            "title": "Antinet系统功能",
            "content": {
                "description": "Antinet智能知识管家是一个端侧智能数据中枢与协同分析平台，支持团队协作、知识管理、数据分析等功能。"
            }
        },
        {
            "card_id": "fact_002",
            "card_type": "blue",
            "title": "团队成员管理",
            "content": {
                "description": "系统支持添加团队成员、分配角色、设置权限，可以查看成员在线状态和贡献度。"
            }
        },
        {
            "card_id": "fact_003",
            "card_type": "blue",
            "title": "知识空间",
            "content": {
                "description": "知识空间用于组织和管理知识卡片，支持创建多个空间，每个空间可以有不同的成员和权限设置。"
            }
        }
    ],
    "green": [  # 解释卡片
        {
            "card_id": "explain_001",
            "card_type": "green",
            "title": "为什么使用Antinet",
            "content": {
                "explanation": "Antinet基于卢曼卡片盒笔记法，采用四色卡片（事实/解释/风险/行动）进行知识组织，帮助团队更好地管理和分享知识。"
            }
        },
        {
            "card_id": "explain_002",
            "card_type": "green",
            "title": "API架构说明",
            "content": {
                "explanation": "后端使用FastAPI框架，提供RESTful API接口。前端使用React和TypeScript，通过fetch调用后端API获取数据。"
            }
        }
    ],
    "yellow": [  # 风险卡片
        {
            "card_id": "risk_001",
            "card_type": "yellow",
            "title": "数据同步风险",
            "content": {
                "risk_level": "中",
                "description": "当前版本数据存储在本地SQLite数据库中，请注意定期备份数据库文件。"
            }
        },
        {
            "card_id": "risk_002",
            "card_type": "yellow",
            "title": "API依赖",
            "content": {
                "risk_level": "高",
                "description": "前端功能依赖于后端API，如果后端服务未启动或端口不正确，前端将无法正常加载数据。"
            }
        }
    ],
    "red": [  # 行动卡片
        {
            "card_id": "action_001",
            "card_type": "red",
            "title": "启动后端服务",
            "content": {
                "priority": "高",
                "action": "运行 `cd backend && python main.py` 启动后端服务，默认运行在8000端口。"
            }
        },
        {
            "card_id": "action_002",
            "card_type": "red",
            "title": "启动前端服务",
            "content": {
                "priority": "中",
                "action": "运行 `npm run dev` 启动前端开发服务器，默认运行在3000端口。"
            }
        }
    ]
}


def _search_cards_by_keyword(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    使用关键词搜索预设的知识卡片

    参数：
        query: 查询关键词
        limit: 返回数量限制

    返回：
        匹配的卡片列表
    """
    all_cards = []
    query_lower = query.lower()

    for card_type, cards in PRESET_KNOWLEDGE_CARDS.items():
        for card in cards:
            # 在标题和内容中搜索关键词
            title_lower = card['title'].lower()
            content = card.get('content', {})
            content_str = ' '.join(str(v) for v in content.values()).lower()

            if query_lower in title_lower or query_lower in content_str:
                card['similarity'] = 0.8  # 简单相似度评分
                all_cards.append(card)

    # 按相似度排序并限制数量
    all_cards.sort(key=lambda x: x['similarity'], reverse=True)
    return all_cards[:limit]


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
            response_parts.append("\n💡 **原因解释：**\n")
            for card in green_cards[:2]:
                title = card.get("title", "无标题")
                content = card.get("content", {})
                explanation = content.get("explanation", "无解释") if isinstance(content, dict) else "无解释"
                response_parts.append(f"- {title}\n  {explanation}\n")

        # 黄色卡片：风险
        if yellow_cards:
            response_parts.append("\n⚠️ **相关风险：**\n")
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
        response_parts.append(f"\n📝 **来源说明：**\n基于知识库中找到的 {len(relevant_cards)} 张相关卡片生成。")

        return "\n".join(response_parts)

    except Exception as e:
        logger.error(f"生成回复失败: {e}", exc_info=True)
        return "抱歉，生成回复时出现了错误。"


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
            cards=cards[:10]
        )

        logger.info(f"[ChatRoutes] 查询完成: {len(cards)}条相关卡片")
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
    logger.info(f"[ChatRoutes] 列出卡片 (类型: {card_type}, 限制: {limit})")

    try:
        # 获取所有卡片
        all_cards = []
        for cards in PRESET_KNOWLEDGE_CARDS.values():
            all_cards.extend(cards)

        # 如果指定了卡片类型，进行过滤
        if card_type:
            all_cards = [c for c in all_cards if c.get("card_type") == card_type]

        # 应用偏移和限制
        total = len(all_cards)
        cards = all_cards[offset:offset + limit]

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
        card_id: 卡片ID

    返回：
        卡片详情
    """
    logger.info(f"[ChatRoutes] 获取卡片: {card_id}")

    try:
        # 在预设卡片中查找
        for cards in PRESET_KNOWLEDGE_CARDS.values():
            for card in cards:
                if card.get("card_id") == card_id:
                    return card

        raise HTTPException(
            status_code=404,
            detail=f"卡片不存在: {card_id}"
        )

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
