"""
知识管理路由
提供知识库的 CRUD 接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from config import settings
from database import DatabaseManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/knowledge", tags=["知识管理"])


# 创建数据库管理器实例
db_manager = DatabaseManager(settings.DB_PATH)


class SearchRequest(BaseModel):
    """知识库搜索请求"""
    keyword: str = Field(..., description="搜索关键词")
    limit: int = Field(10, description="返回数量限制")


@router.get("/graph")
async def get_knowledge_graph(
    card_type: Optional[str] = None,
    limit: int = 100
):
    """
    获取知识图谱数据
    
    参数：
        card_type: 卡片类型过滤（可选）
        limit: 节点数量限制
    
    返回：
        知识图谱数据（节点+边）
    """
    try:
        from services.skill_system import get_skill_registry
        
        # 获取技能注册表
        registry = get_skill_registry()
        
        # 获取所有卡片
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM knowledge_cards WHERE 1=1"
        params = []
        
        if card_type:
            query += " AND type = ?"
            params.append(card_type)
        
        query += " LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # 转换为字典列表
        cards = [dict(row) for row in rows]
        
        # 调用知识图谱可视化技能
        result = await registry.execute_skill(
            "knowledge_graph_visualization",
            cards=cards
        )
        
        return result.get("result", {})
        
    except Exception as e:
        logger.error(f"获取知识图谱失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class KnowledgeCard(BaseModel):
    """知识卡片模型"""
    id: Optional[int] = None
    type: str
    title: str
    content: str
    source: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None


class KnowledgeSource(BaseModel):
    """知识来源模型"""
    id: Optional[int] = None
    source_path: str
    source_type: str
    total_cards: int = 0


@router.get("/cards")
async def get_cards(
    card_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    获取知识卡片列表

    Args:
        card_type: 卡片类型过滤（blue/green/yellow/red）
        category: 分类过滤
        limit: 返回数量限制
        offset: 偏移量

    Returns:
        卡片列表
    """
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM knowledge_cards WHERE 1=1"
    params = []

    if card_type:
        query += " AND type = ?"
        params.append(card_type)

    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    cards = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return cards


@router.get("/cards/{card_id}")
async def get_card(card_id: int):
    """
    获取单个知识卡片

    Args:
        card_id: 卡片ID

    Returns:
        卡片详情
    """
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
    card = cursor.fetchone()

    conn.close()

    if not card:
        raise HTTPException(status_code=404, detail="卡片不存在")

    return dict(card)


@router.post("/cards")
async def create_card(card: KnowledgeCard):
    """
    创建新的知识卡片

    Args:
        card: 卡片数据

    Returns:
        创建的卡片
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO knowledge_cards (type, title, content, source, url, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            card.type,
            card.title,
            card.content,
            card.source,
            card.url,
            card.category
        ))

        conn.commit()

        # 获取新插入的卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (cursor.lastrowid,))
        new_card = dict(cursor.fetchone())

        conn.close()
        return new_card

    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"创建失败: {str(e)}")


@router.delete("/cards/{card_id}")
async def delete_card(card_id: int):
    """
    删除知识卡片

    Args:
        card_id: 卡片ID

    Returns:
        删除结果
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM knowledge_cards WHERE id = ?", (card_id,))
    conn.commit()

    conn.close()

    return {"success": True, "message": "卡片已删除"}


@router.get("/stats")
async def get_stats():
    """
    获取知识库统计信息

    Returns:
        统计信息
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 总卡片数
    cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
    total_cards = cursor.fetchone()[0]

    # 按类型分组
    cursor.execute("SELECT type, COUNT(*) as count FROM knowledge_cards GROUP BY type")
    cards_by_type = {row[0]: row[1] for row in cursor.fetchall()}

    # 按分类分组
    cursor.execute("SELECT category, COUNT(*) as count FROM knowledge_cards GROUP BY category")
    cards_by_category = {row[0]: row[1] for row in cursor.fetchall()}

    conn.close()

    return {
        "total_cards": total_cards,
        "cards_by_type": cards_by_type,
        "cards_by_category": cards_by_category
    }


@router.post("/search")
async def search_cards(request: SearchRequest):
    """
    搜索知识卡片

    Args:
        request: 搜索请求（包含关键词和限制）

    Returns:
        匹配的卡片列表
    """
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        keyword = request.keyword
        limit = request.limit

        cursor.execute('''
            SELECT * FROM knowledge_cards
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (f'%{keyword}%', f'%{keyword}%', limit))

        cards = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return cards
    except Exception as e:
        logger.error(f"搜索失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@router.get("/sources")
async def get_sources():
    """
    获取知识来源列表

    Returns:
        来源列表
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM knowledge_sources ORDER BY last_imported DESC")
    sources = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return sources


@router.post("/import")
async def import_knowledge(html_dir: str):
    """
    导入知识库

    Args:
        html_dir: HTML 文件目录

    Returns:
        导入结果
    """
    try:
        # 添加项目路径到 sys.path
        import sys
        from pathlib import Path
        project_root = Path(__file__).parent.parent.parent
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))

        # 动态导入批量导入工具
        import importlib
        import os

        # 设置 PYTHONPATH 环境变量
        os.environ['PYTHONPATH'] = str(project_root)

        # 导入批量导入模块
        spec = importlib.util.spec_from_file_location(
            "import_knowledge_batch",
            str(project_root / "backend" / "tools" / "import_knowledge_batch.py")
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # 执行批量导入
        module.batch_import(html_dir)

        return {
            "success": True,
            "message": "知识库导入成功",
            "html_dir": html_dir
        }
    except Exception as e:
        import traceback
        logger.error(f"导入失败: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")
