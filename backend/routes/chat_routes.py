#!/usr/bin/env python3
# backend/routes/chat_routes.py - 知识库聊天路由
"""
提供知识库查询和对话机器人功能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import sys
import os

# 添加data-analysis-iteration目录到路径，以便导入DatabaseManager
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'data-analysis-iteration'))

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["聊天机器人"])

# 全局知识库数据库管理器引用
_knowledge_db_manager = None


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


def _init_knowledge_db_manager():
    """初始化知识库数据库管理器"""
    global _knowledge_db_manager

    if _knowledge_db_manager is not None:
        return True

    try:
        from database.database_manager import DatabaseManager

        # 使用data-analysis-iteration目录下的数据库路径
        knowledge_db_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data-analysis-iteration', 'data', 'knowledge.db'
        )
        duckdb_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data-analysis-iteration', 'data', 'analysis.db'
        )

        _knowledge_db_manager = DatabaseManager(
            knowledge_db_path=knowledge_db_path,
            duckdb_path=duckdb_path
        )

        logger.info(f"[ChatRoutes] 知识库数据库管理器已初始化")
        logger.info(f"  - SQLite: {knowledge_db_path}")
        logger.info(f"  - DuckDB: {duckdb_path}")

        return True
    except Exception as e:
        logger.error(f"[ChatRoutes] 初始化知识库数据库管理器失败: {e}", exc_info=True)
        return False


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
            return "抱歉，我没有找到与您的问题相关的知识卡片。您可以尝试换个问法，或者联系管理员添加相关知识。"

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
        # 确保知识库数据库管理器已初始化
        if not _knowledge_db_manager:
            if not _init_knowledge_db_manager():
                raise HTTPException(
                    status_code=503,
                    detail="知识库数据库初始化失败"
                )

        # 导入MemoryAgent用于向量化
        try:
            from agents.memory import MemoryAgent

            # 创建临时MemoryAgent实例用于向量化
            memory = MemoryAgent(
                knowledge_db_path=_knowledge_db_manager.knowledge_db_path,
                duckdb_path=_knowledge_db_manager.duckdb_path
            )

            # 生成查询向量
            query_embedding = memory._generate_query_embedding(request.query)

            # 向量检索
            search_results = _knowledge_db_manager.vector_search(
                query_embedding=query_embedding,
                top_k=10
            )

            # 获取完整卡片数据
            cards = []
            for card_id, similarity in search_results:
                card = _knowledge_db_manager.get_card(card_id)
                if card:
                    card["similarity"] = round(similarity, 4)
                    cards.append(card)

        except Exception as e:
            logger.warning(f"[ChatRoutes] 向量检索失败，使用简单查询: {e}")
            # 回退：简单查询
            cards = _knowledge_db_manager.query_cards(limit=10)

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
                    similarity=card.get("similarity", 0.0)
                )
                for card in cards[:5]
            ],
            cards=cards[:10]
        )

        logger.info(f"[ChatRoutes] 查询完成: {len(cards)}条相关卡片")
        return result

    except HTTPException:
        raise
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
        # 确保知识库数据库管理器已初始化
        if not _knowledge_db_manager:
            if not _init_knowledge_db_manager():
                raise HTTPException(
                    status_code=503,
                    detail="知识库数据库初始化失败"
                )

        # 导入MemoryAgent用于向量化
        try:
            from agents.memory import MemoryAgent

            # 创建临时MemoryAgent实例用于向量化
            memory = MemoryAgent(
                knowledge_db_path=_knowledge_db_manager.knowledge_db_path,
                duckdb_path=_knowledge_db_manager.duckdb_path
            )

            # 生成查询向量
            query_embedding = memory._generate_query_embedding(request.query)

            # 向量检索
            search_results = _knowledge_db_manager.vector_search(
                query_embedding=query_embedding,
                card_type=request.card_type,
                top_k=request.limit
            )

            # 获取完整卡片数据
            cards = []
            for card_id, similarity in search_results:
                card = _knowledge_db_manager.get_card(card_id)
                if card:
                    card["similarity"] = round(similarity, 4)
                    cards.append(card)

        except Exception as e:
            logger.warning(f"[ChatRoutes] 向量检索失败，使用简单查询: {e}")
            # 回退：简单查询
            cards = _knowledge_db_manager.query_cards(
                card_type=request.card_type,
                limit=request.limit
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
    列出知识卡片

    参数：
        card_type: 卡片类型过滤（可选）
        limit: 返回数量限制（默认50）
        offset: 偏移量（默认0）
    """
    logger.info(f"[ChatRoutes] 列出卡片 (类型: {card_type}, 限制: {limit})")

    try:
        # 确保知识库数据库管理器已初始化
        if not _knowledge_db_manager:
            if not _init_knowledge_db_manager():
                raise HTTPException(
                    status_code=503,
                    detail="知识库数据库初始化失败"
                )

        # 查询卡片
        cards = _knowledge_db_manager.query_cards(
            card_type=card_type,
            limit=limit,
            offset=offset
        )

        return {
            "cards": cards,
            "total": len(cards)
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
        # 确保知识库数据库管理器已初始化
        if not _knowledge_db_manager:
            if not _init_knowledge_db_manager():
                raise HTTPException(
                    status_code=503,
                    detail="知识库数据库初始化失败"
                )

        # 获取卡片
        card = _knowledge_db_manager.get_card(card_id)

        if not card:
            raise HTTPException(
                status_code=404,
                detail=f"卡片不存在: {card_id}"
            )

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
        # 尝试初始化知识库数据库管理器
        success = _init_knowledge_db_manager()

        return {
            "status": "healthy" if success else "degraded",
            "database_initialized": success
        }
    except Exception as e:
        logger.error(f"[ChatRoutes] 健康检查失败: {e}", exc_info=True)
        return {
            "status": "degraded",
            "database_initialized": False,
            "error": str(e)
        }
