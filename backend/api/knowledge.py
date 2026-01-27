"""
知识图谱API路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class Node(BaseModel):
    """图谱节点"""
    id: str
    label: str
    type: str  # blue/green/yellow/red
    layer: str  # fact/analysis/creative/risk

class Edge(BaseModel):
    """图谱边"""
    source: str
    target: str
    label: str
    relation_type: str

class KnowledgeGraphResponse(BaseModel):
    """知识图谱响应"""
    nodes: List[Node]
    edges: List[Edge]

@router.get("/graph")
async def get_knowledge_graph(
    filters: Optional[str] = None,
    limit: int = 100
):
    """
    获取知识图谱数据

    从太史阁（Taishige）知识库获取真实的图谱数据

    参数：
        filters: 过滤条件（JSON格式）
        limit: 返回节点数量限制

    返回：
        节点和边的列表
    """
    try:
        # 从太史阁Agent获取图谱数据
        from agents.taishige import TaishigeAgent

        # 创建太史阁实例
        taishi_ge = TaishigeAgent(task_id="knowledge_api")

        # 从太史阁的知识库中提取节点和边
        # knowledge_base 包含存储的知识项
        nodes = []
        edges = []

        # 如果有知识库数据，提取节点
        if hasattr(taishi_ge, 'knowledge_base') and len(taishi_ge.knowledge_base) > 0:
            for idx, knowledge_item in enumerate(taishi_ge.knowledge_base[:limit]):
                # 将知识项转换为节点
                content = knowledge_item.get('content', {})
                if isinstance(content, dict):
                    # 从内容中提取卡片信息
                    cards = content.get('cards', []) if 'cards' in content else [content]

                    for card in cards:
                        card_type = card.get('type', 'blue')
                        layer = 'fact'
                        if card_type == 'green':
                            layer = 'analysis'
                        elif card_type == 'yellow':
                            layer = 'creative'
                        elif card_type == 'red':
                            layer = 'risk'

                        nodes.append(Node(
                            id=f"{knowledge_item['knowledge_id']}_{len(nodes)}",
                            label=card.get('title', card.get('content', '无标题')[:50]),
                            type=card_type,
                            layer=layer
                        ))

                    # 创建节点之间的关联边
                    if len(nodes) > 1:
                        for i in range(len(nodes) - 1):
                            edges.append(Edge(
                                source=nodes[i].id,
                                target=nodes[i + 1].id,
                                label="关联",
                                relation_type="related"
                            ))
        else:
            # 如果知识库为空，返回空数据（而非模拟数据）
            logger.warning("太史阁知识库为空，返回空图谱")
            return KnowledgeGraphResponse(nodes=[], edges=[])

        return KnowledgeGraphResponse(nodes=nodes, edges=edges)

    except Exception as e:
        logger.error(f"获取知识图谱失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_knowledge(
    query: str,
    top_k: int = 10
):
    """
    语义检索知识

    从太史阁（Taishige）知识库使用向量检索查找相关知识

    参数：
        query: 查询内容
        top_k: 返回结果数量

    返回：
        相关卡片列表
    """
    try:
        # 从太史阁Agent进行语义检索
        from agents.taishige import TaishigeAgent

        # 创建太史阁实例
        taishi_ge = TaishigeAgent(task_id="search_api")

        # 提取关键词用于检索
        keywords = query.split()

        # 使用太史阁的检索功能
        related_cases = taishi_ge.retrieve_cases(keywords=keywords, top_k=top_k)

        # 转换检索结果为API响应格式
        results = []
        for case in related_cases:
            if isinstance(case, dict):
                content = case.get('content', {})
                if isinstance(content, dict):
                    cards = content.get('cards', []) if 'cards' in content else [content]

                    for card in cards[:top_k]:
                        results.append({
                            "card_id": case.get('knowledge_id', ''),
                            "similarity": case.get('similarity', 0.8),
                            "card_type": card.get('type', 'blue'),
                            "title": card.get('title', card.get('content', '无标题')[:50]),
                            "summary": card.get('content', '')[:200] + '...' if len(card.get('content', '')) > 200 else card.get('content', '')
                        })

        return {
            "query": query,
            "top_k": top_k,
            "results": results
        }

    except Exception as e:
        logger.error(f"语义检索失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities")
async def get_activities(limit: int = 20):
    """
    获取最近活动记录

    从数据库获取真实的协作活动记录

    参数：
        limit: 返回数量限制

    返回：
        活动列表
    """
    try:
        # 从数据库获取活动记录
        # 数据库管理器需要从全局获取
        from database import DatabaseManager
        from config import settings

        # 创建数据库连接
        db_manager = DatabaseManager(settings.DB_PATH)

        # 从数据库获取最近的活动
        activities = db_manager.get_recent_activities(limit=limit)

        # 转换为API响应格式
        formatted_activities = []
        for activity in activities:
            metadata = activity.get('metadata', {})
            if isinstance(metadata, str):
                import json
                try:
                    metadata = json.loads(metadata)
                except:
                    metadata = {}

            formatted_activities.append({
                "id": activity['id'],
                "title": activity['action'],
                "type": "activity",
                "time": activity['timestamp'],
                "description": activity['content'],
                "user_name": activity['user_name'],
                "space_id": activity.get('space_id'),
                "metadata": metadata
            })

        return {
            "activities": formatted_activities
        }

    except Exception as e:
        logger.error(f"获取活动记录失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
