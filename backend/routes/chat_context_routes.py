#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对话上下文链 API
提供完整的多轮对话-知识关联功能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat/context", tags=["对话上下文链"])

context_mgr = None


def set_context_manager(manager):
    """设置上下文管理器"""
    global context_mgr
    context_mgr = manager
    logger.info("[Context API] 上下文管理器已设置")


class CreateChainRequest(BaseModel):
    """Create chain request"""
    user_id: str = Field(default="default_user", description="User ID")


class AddTurnRequest(BaseModel):
    """Add conversation turn request"""
    chain_id: str = Field(..., description="Conversation chain ID")
    user_query: str = Field(..., description="User query")
    assistant_response: str = Field(..., description="Assistant response")
    card_links: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Linked cards")
    entity_links: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Linked entities")
    model: str = Field(default="unknown", description="Model used")


class GetContextRequest(BaseModel):
    """Get context request"""
    chain_id: str
    current_query: str
    max_turns: int = Field(default=5, description="Max history turns")


@router.post("/chain/create")
async def create_chain(request: CreateChainRequest):
    """创建新对话链"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    try:
        chain = context_mgr.create_chain(request.user_id)
        return {
            "success": True,
            "chain_id": chain.chain_id,
            "user_id": chain.user_id,
            "created_at": chain.created_at
        }
    except Exception as e:
        logger.error(f"创建对话链失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chain/add_turn")
async def add_turn(request: AddTurnRequest):
    """添加对话轮次"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    try:
        from routes.conversation_context import ContextLink
        
        links = []
        for cl in request.card_links:
            links.append(ContextLink(
                link_type="card",
                link_id=cl.get("id", ""),
                title=cl.get("title", ""),
                relevance=cl.get("relevance", 0.5),
                quote=cl.get("quote")
            ))
        
        for el in request.entity_links:
            links.append(ContextLink(
                link_type="entity",
                link_id=el.get("id", ""),
                title=el.get("name", ""),
                relevance=el.get("relevance", 0.5)
            ))
        
        turn = context_mgr.add_turn(
            chain_id=request.chain_id,
            user_query=request.user_query,
            assistant_response=request.assistant_response,
            links=links,
            model=request.model
        )
        
        if turn is None:
            raise HTTPException(status_code=404, detail="对话链不存在")
        
        return {
            "success": True,
            "turn_id": turn.turn_id,
            "timestamp": turn.timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加对话轮次失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chain/{chain_id}")
async def get_chain(chain_id: str):
    """获取对话链"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    chain = context_mgr.get_chain(chain_id)
    if chain is None:
        raise HTTPException(status_code=404, detail="对话链不存在")
    
    return {
        "chain_id": chain.chain_id,
        "user_id": chain.user_id,
        "turns_count": len(chain.turns),
        "created_at": chain.created_at,
        "updated_at": chain.updated_at,
        "summary": chain.summary
    }


@router.get("/chain/{chain_id}/history")
async def get_chain_history(chain_id: str, limit: int = 10):
    """获取对话历史"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    chain = context_mgr.get_chain(chain_id)
    if chain is None:
        raise HTTPException(status_code=404, detail="对话链不存在")
    
    return {
        "chain_id": chain.chain_id,
        "turns": [
            {
                "turn_id": t.turn_id,
                "user_query": t.user_query,
                "assistant_response": t.assistant_response[:200],
                "timestamp": t.timestamp,
                "model": t.model,
                "links_count": len(t.links)
            }
            for t in chain.turns[-limit:]
        ]
    }


@router.get("/chain/{chain_id}/links")
async def get_chain_links(chain_id: str, limit: int = 10):
    """获取关联的知识"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    links = context_mgr.get_recent_links(chain_id, limit)
    
    return {
        "chain_id": chain_id,
        "links": [
            {
                "link_type": l.link_type,
                "link_id": l.link_id,
                "title": l.title,
                "relevance": l.relevance,
                "quote": l.quote
            }
            for l in links
        ]
    }


@router.post("/chain/context")
async def get_context_for_llm(request: GetContextRequest):
    """获取用于 LLM 的上下文"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    context_str = context_mgr.generate_context_for_llm(
        chain_id=request.chain_id,
        current_query=request.current_query,
        max_turns=request.max_turns
    )
    
    return {
        "chain_id": request.chain_id,
        "context": context_str
    }


@router.delete("/chain/{chain_id}")
async def delete_chain(chain_id: str):
    """删除对话链"""
    global context_mgr
    if context_mgr is None:
        raise HTTPException(status_code=500, detail="上下文管理器未初始化")
    
    success = context_mgr.delete_chain(chain_id)
    if not success:
        raise HTTPException(status_code=404, detail="对话链不存在")
    
    return {"success": True, "message": "对话链已删除"}


@router.get("/health")
async def health():
    """健康检查"""
    return {
        "status": "ok",
        "service": "chat-context",
        "features": {
            "chain_management": True,
            "context_retrieval": True
        }
    }