"""
思维导图路由
支持思维导图与知识卡片的关联管理
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import json

from config import settings
from database import DatabaseManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mindmap", tags=["mindmap"])

db_manager = DatabaseManager(settings.DB_PATH)


class MindMapNode(BaseModel):
    id: str
    text: str
    children: List['MindMapNode'] = []
    collapsed: bool = False
    color: str = '#8b5cf6'


class MindMapCreate(BaseModel):
    name: str
    root_node: Dict[str, Any]
    description: Optional[str] = None
    card_ids: Optional[List[int]] = []


class MindMapUpdate(BaseModel):
    name: Optional[str] = None
    root_node: Optional[Dict[str, Any]] = None
    description: Optional[str] = None


class CardLink(BaseModel):
    card_id: int
    node_id: str


@router.get("/")
async def get_mindmaps(limit: int = 50):
    """获取所有思维导图"""
    try:
        return db_manager.get_all_mindmaps(limit)
    except Exception as e:
        logger.error(f"获取思维导图失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{mindmap_id}")
async def get_mindmap(mindmap_id: int):
    """获取单个思维导图详情"""
    mindmap = db_manager.get_mindmap(mindmap_id)
    if not mindmap:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    return mindmap


@router.post("/")
async def create_mindmap(data: MindMapCreate):
    """创建思维导图"""
    try:
        mindmap = db_manager.save_mindmap(
            name=data.name,
            root_node=data.root_node,
            description=data.description,
            card_ids=data.card_ids
        )
        return mindmap
    except Exception as e:
        logger.error(f"创建思维导图失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{mindmap_id}")
async def update_mindmap(mindmap_id: int, data: MindMapUpdate):
    """更新思维导图"""
    mindmap = db_manager.update_mindmap(
        mindmap_id,
        name=data.name,
        root_node=data.root_node,
        description=data.description
    )
    if not mindmap:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    return mindmap


@router.delete("/{mindmap_id}")
async def delete_mindmap(mindmap_id: int):
    """删除思维导图"""
    success = db_manager.delete_mindmap(mindmap_id)
    if not success:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    return {"status": "deleted"}


@router.get("/{mindmap_id}/cards")
async def get_mindmap_cards(mindmap_id: int, node_id: Optional[str] = None):
    """获取思维导图关联的卡片"""
    if node_id:
        return db_manager.get_node_cards(mindmap_id, node_id)
    
    mindmap = db_manager.get_mindmap(mindmap_id)
    if not mindmap:
        raise HTTPException(status_code=404, detail="思维导图不存在")
    
    all_cards = []
    def collect_cards(node):
        node_id_val = node.get('id')
        if node_id_val:
            cards = db_manager.get_node_cards(mindmap_id, node_id_val)
            for c in cards:
                c['node_id'] = node_id_val
            all_cards.extend(cards)
        for child in node.get('children', []):
            collect_cards(child)
    
    collect_cards(mindmap.get('root_node', {}))
    return all_cards


@router.post("/{mindmap_id}/link")
async def link_card(mindmap_id: int, data: CardLink):
    """关联卡片到节点"""
    success = db_manager.link_card_to_node(mindmap_id, data.node_id, data.card_id)
    if not success:
        raise HTTPException(status_code=400, detail="关联失败")
    return {"status": "linked"}


@router.delete("/{mindmap_id}/link")
async def unlink_card(mindmap_id: int, data: CardLink):
    """取消关联卡片与节点"""
    success = db_manager.unlink_card_from_node(mindmap_id, data.node_id, data.card_id)
    return {"status": "unlinked"}


@router.get("/card/{card_id}/mindmaps")
async def get_card_mindmaps(card_id: int):
    """获取卡片关联的思维导图"""
    return db_manager.get_card_mindmaps(card_id)


# 单独引入以避免循环依赖
MindMapNode.model_rebuild()