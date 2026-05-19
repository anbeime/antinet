"""
双向链接 API 路由
提供知识卡片双向链接功能，支持可视化展示
解决：网状组织 - 双向链接不完善问题
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import sqlite3
from pathlib import Path

from paths import DB_PATH

router = APIRouter(prefix="/api/backlinks", tags=["双向链接 - 网状知识组织"])


class BacklinkCreate(BaseModel):
    """创建双向链接请求"""
    source_card_id: int
    target_card_id: int
    link_text: Optional[str] = None


class BacklinkNode(BaseModel):
    """双向链接图节点"""
    id: int
    title: str
    type: Optional[str] = None
    is_current: bool
    link_text: Optional[str] = None


class BacklinkLink(BaseModel):
    """双向链接图边"""
    source: int
    target: int
    type: str  # forwardlink / backlink


class BacklinkGraph(BaseModel):
    """双向链接图谱响应"""
    nodes: List[BacklinkNode]
    links: List[BacklinkLink]


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


@router.post("/add", summary="添加双向链接")
async def add_backlink(req: BacklinkCreate):
    """添加双向链接：从 source_card 链接到 target_card"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查卡片是否存在
        cursor.execute("SELECT id FROM knowledge_cards WHERE id = ?", (req.source_card_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="源卡片不存在")
        
        cursor.execute("SELECT id FROM knowledge_cards WHERE id = ?", (req.target_card_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="目标卡片不存在")
        
        # 添加正向链接 A→B
        cursor.execute("""
            INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
            VALUES (?, ?, ?)
        """, (req.source_card_id, req.target_card_id, req.link_text or 'manual'))

        # 添加反向链接 B→A（双向关联）
        cursor.execute("""
            INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
            VALUES (?, ?, ?)
        """, (req.target_card_id, req.source_card_id, req.link_text or 'backlink'))

        conn.commit()
        inserted = cursor.rowcount > 0
        conn.close()

        return {
            "success": True,
            "inserted": inserted,
            "source_card_id": req.source_card_id,
            "target_card_id": req.target_card_id,
            "bidirectional": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加双向链接失败: {str(e)}")


@router.delete("/remove", summary="移除双向链接")
async def remove_backlink(source_card_id: int, target_card_id: int):
    """移除双向链接（A→B 和 B→A 同时删除）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        # 删除 A→B
        cursor.execute("""
            DELETE FROM card_backlinks
            WHERE source_card_id = ? AND target_card_id = ?
        """, (source_card_id, target_card_id))
        deleted_forward = cursor.rowcount > 0
        # 删除 B→A（反向）
        cursor.execute("""
            DELETE FROM card_backlinks
            WHERE source_card_id = ? AND target_card_id = ?
        """, (target_card_id, source_card_id))
        deleted_backward = cursor.rowcount > 0
        conn.commit()
        conn.close()

        return {
            "success": True,
            "deleted": deleted_forward or deleted_backward
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除双向链接失败: {str(e)}")


@router.get("/card/{card_id}/backlinks", summary="获取卡片的反向链接", response_model=List[dict])
async def get_backlinks(card_id: int):
    """获取指向本卡片的所有反向链接（哪些卡片链接到了我）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT k.id, k.title, COALESCE(k.card_type, k.type, 'blue') as card_type, k.created_at, r.link_text
            FROM knowledge_cards k
            JOIN card_backlinks r ON k.id = r.source_card_id
            WHERE r.target_card_id = ?
            ORDER BY k.created_at DESC
        """, (card_id,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "id": row["id"],
                "title": row["title"],
                "card_type": row["card_type"],
                "created_at": row["created_at"],
                "link_text": row["link_text"]
            })
        
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取反向链接失败: {str(e)}")


@router.get("/card/{card_id}/forwardlinks", summary="获取卡片的正向链接", response_model=List[dict])
async def get_forwardlinks(card_id: int):
    """获取从本卡片发出的所有正向链接（我链接到了哪些卡片）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT k.id, k.title, COALESCE(k.card_type, k.type, 'blue') as card_type, k.created_at, r.link_text
            FROM knowledge_cards k
            JOIN card_backlinks r ON k.id = r.target_card_id
            WHERE r.source_card_id = ?
            ORDER BY k.created_at DESC
        """, (card_id,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "id": row["id"],
                "title": row["title"],
                "card_type": row["card_type"],
                "created_at": row["created_at"],
                "link_text": row["link_text"]
            })
        
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取正向链接失败: {str(e)}")


@router.get("/card/{card_id}/graph", summary="获取卡片双向链接图谱（用于可视化）", response_model=BacklinkGraph)
async def get_backlink_graph(card_id: int, max_depth: int = 2):
    """获取卡片的双向链接图谱，用于可视化展示"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 获取当前卡片信息
        cursor.execute("SELECT id, title, COALESCE(card_type, type, 'blue') as card_type FROM knowledge_cards WHERE id = ?", (card_id,))
        current = cursor.fetchone()
        if not current:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        nodes = [{
            "id": current["id"],
            "title": current["title"],
            "type": current["card_type"],
            "is_current": True
        }]
        
        links = []
        
        # 获取反向链接（别人链接到我）
        cursor.execute("""
            SELECT k.id, k.title, COALESCE(k.card_type, k.type, 'blue') as card_type, r.link_text
            FROM knowledge_cards k
            JOIN card_backlinks r ON k.id = r.source_card_id
            WHERE r.target_card_id = ?
            ORDER BY k.created_at DESC
        """, (card_id,))
        
        for row in cursor.fetchall():
            nodes.append({
                "id": row["id"],
                "title": row["title"],
                "type": row["card_type"],
                "is_current": False
            })
            links.append({
                "source": row["id"],
                "target": card_id,
                "type": "backlink"
            })
        
        # 获取正向链接（我链接到别人）
        cursor.execute("""
            SELECT k.id, k.title, COALESCE(k.card_type, k.type, 'blue') as card_type, r.link_text
            FROM knowledge_cards k
            JOIN card_backlinks r ON k.id = r.target_card_id
            WHERE r.source_card_id = ?
            ORDER BY k.created_at DESC
        """, (card_id,))
        
        for row in cursor.fetchall():
            nodes.append({
                "id": row["id"],
                "title": row["title"],
                "type": row["card_type"],
                "is_current": False
            })
            links.append({
                "source": card_id,
                "target": row["id"],
                "type": "forwardlink"
            })
        
        conn.close()
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取双向链接图谱失败: {str(e)}")


@router.get("/stats/{card_id}", summary="获取卡片双向链接统计")
async def get_backlink_stats(card_id: int):
    """获取卡片双向链接统计信息"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) FROM card_backlinks WHERE target_card_id = ?
        """, (card_id,))
        backlink_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM card_backlinks WHERE source_card_id = ?
        """, (card_id,))
        forwardlink_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "card_id": card_id,
            "backlink_count": backlink_count,
            "forwardlink_count": forwardlink_count,
            "total_links": backlink_count + forwardlink_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计失败: {str(e)}")


@router.get("/health", summary="健康检查")
async def backlink_health():
    """双向链接功能健康检查"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM card_backlinks")
        count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "message": "双向链接功能就绪",
            "total_links": count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
