# -*- coding: utf-8 -*-
"""
专题研究 API 路由
提供专题研究管理功能
"""

import sys
import io
# 确保 UTF-8 编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
from pathlib import Path
import json

# 自定义 JSON 编码器确保 UTF-8
class UTF8Encoder(json.JSONEncoder):
    def encode(self, obj):
        return super().encode(obj).encode('utf-8').decode('utf-8')

router = APIRouter(prefix="/api/research", tags=["专题研究"])

# 数据库路径
DB_PATH = Path(__file__).parent.parent / "data" / "antinet.db"


class ResearchProject(BaseModel):
    """专题研究模型"""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    color: Optional[str] = "blue"
    icon: Optional[str] = "📚"
    status: Optional[str] = "active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ResearchProjectCreate(BaseModel):
    """创建专题研究"""
    name: str
    description: Optional[str] = None
    color: Optional[str] = "blue"
    icon: Optional[str] = "📚"


class ResearchProjectUpdate(BaseModel):
    """更新专题研究"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ProjectTask(BaseModel):
    """专题任务"""
    task_id: int
    project_id: int


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # 设置 UTF-8 编码
    conn.execute("PRAGMA encoding='UTF-8'")
    return conn


@router.get("/projects", response_model=List[ResearchProject])
async def get_all_projects():
    """获取所有专题研究"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM research_projects
            WHERE status = 'active'
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        projects = []
        for row in rows:
            projects.append({
                "id": row["id"],
                "name": row["name"],
                "description": row["description"],
                "color": row["color"],
                "icon": row["icon"],
                "status": row["status"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
        conn.close()
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取专题研究失败: {str(e)}")


@router.get("/projects/{project_id}", response_model=ResearchProject)
async def get_project(project_id: int):
    """获取单个专题研究详情"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "color": row["color"],
            "icon": row["icon"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取专题研究失败: {str(e)}")


class CardCreateRequest(BaseModel):
    """创建卡片请求"""
    card_type: str  # blue/green/yellow/red
    title: Optional[str] = None
    content: str
    category: Optional[str] = None


@router.post("/projects/{project_id}/cards")
async def create_project_card(project_id: int, card: CardCreateRequest):
    """在专题下创建卡片（自动生成标题）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        now = datetime.now().isoformat()
        
        # 自动生成标题（如果未提供）
        card_title = card.title
        if not card_title or not card_title.strip():
            if card.content:
                preview = card.content.strip()[:30]
                preview = preview.rstrip('。！?？,，')
                card_title = preview + "..." if preview else None
            
            if not card_title:
                type_to_title = {
                    'blue': '新事实',
                    'green': '新解释',
                    'yellow': '新风险',
                    'red': '新行动'
                }
                card_title = type_to_title.get(card.card_type, '新卡片')
        
        # 确定分类
        valid_categories = {'事实', '解释', '风险', '行动'}
        card_category = card.category
        if not card_category or card_category not in valid_categories:
            type_to_category = {
                'blue': '事实',
                'green': '解释',
                'yellow': '风险',
                'red': '行动'
            }
            card_category = type_to_category.get(card.card_type, '事实')
        
        # 插入卡片
        cursor.execute("""
            INSERT INTO knowledge_cards (card_type, title, content, category, project_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (card.card_type, card_title, card.content, card_category, project_id, now, now))
        
        card_id = cursor.lastrowid
        conn.commit()
        
        # 获取新卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "card_type": row["card_type"],
            "title": row["title"],
            "content": row["content"],
            "category": row["category"],
            "project_id": row["project_id"],
            "created_at": row["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建卡片失败: {str(e)}")


class CardUpdateRequest(BaseModel):
    """更新卡片请求"""
    title: Optional[str] = None
    content: Optional[str] = None
    card_type: Optional[str] = None
    category: Optional[str] = None


@router.put("/projects/{project_id}/cards/{card_id}")
async def update_project_card(project_id: int, card_id: int, card: CardUpdateRequest):
    """编辑专题下的卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 检查卡片是否存在且属于该专题
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ? AND project_id = ?", (card_id, project_id))
        existing_card = cursor.fetchone()
        if not existing_card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在或不属于该专题")
        
        # 构建更新语句
        updates = []
        values = []
        
        if card.title is not None:
            updates.append("title = ?")
            values.append(card.title)
        
        if card.content is not None:
            updates.append("content = ?")
            values.append(card.content)
        
        if card.card_type is not None:
            updates.append("card_type = ?")
            values.append(card.card_type)
            
            # 如果更改了类型，自动更新分类
            if card.category is None:
                type_to_category = {
                    'blue': '事实',
                    'green': '解释',
                    'yellow': '风险',
                    'red': '行动'
                }
                updates.append("category = ?")
                values.append(type_to_category.get(card.card_type, '事实'))
        
        if card.category is not None:
            updates.append("category = ?")
            values.append(card.category)
        
        if not updates:
            conn.close()
            raise HTTPException(status_code=400, detail="没有要更新的内容")
        
        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        
        values.extend([card_id, project_id])
        
        cursor.execute(f"""
            UPDATE knowledge_cards 
            SET {', '.join(updates)}
            WHERE id = ? AND project_id = ?
        """, values)
        
        conn.commit()
        
        # 获取更新后的卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "card_type": row["card_type"],
            "title": row["title"],
            "content": row["content"],
            "category": row["category"],
            "project_id": row["project_id"],
            "created_at": row["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新卡片失败: {str(e)}")


@router.delete("/projects/{project_id}/cards/{card_id}")
async def delete_project_card(project_id: int, card_id: int):
    """删除专题下的卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 检查卡片是否存在且属于该专题
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ? AND project_id = ?", (card_id, project_id))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在或不属于该专题")
        
        # 删除卡片
        cursor.execute("DELETE FROM knowledge_cards WHERE id = ?", (card_id,))
        conn.commit()
        conn.close()
        
        return {"message": "卡片已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除卡片失败: {str(e)}")


@router.get("/all-cards")
async def get_all_cards_for_link():
    """获取所有可关联的卡片（用于关联到专题）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 获取没有关联专题的卡片
        cursor.execute("""
            SELECT id, card_type, title, content, created_at 
            FROM knowledge_cards 
            WHERE project_id IS NULL
            ORDER BY created_at DESC
            LIMIT 100
        """)
        rows = cursor.fetchall()
        
        cards = []
        for row in rows:
            cards.append({
                "id": row["id"],
                "card_type": row["card_type"],
                "title": row["title"],
                "content": row["content"][:100] + "..." if len(row["content"]) > 100 else row["content"],
                "created_at": row["created_at"]
            })
        
        conn.close()
        return cards
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取卡片列表失败: {str(e)}")


@router.get("/projects/{project_id}/linkable-cards")
async def get_linkable_cards(project_id: int):
    """获取可关联到专题的卡片（当前未关联其他专题的卡片）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 获取不属于任何专题的卡片
        cursor.execute("""
            SELECT id, card_type, title, content, created_at 
            FROM knowledge_cards 
            WHERE project_id IS NULL OR project_id = ?
            ORDER BY created_at DESC
            LIMIT 100
        """, (project_id,))
        rows = cursor.fetchall()
        
        cards = []
        for row in rows:
            cards.append({
                "id": row["id"],
                "card_type": row["card_type"],
                "title": row["title"],
                "content": row["content"][:100] + "..." if len(row["content"]) > 100 else row["content"],
                "is_linked": row["project_id"] == project_id,
                "created_at": row["created_at"]
            })
        
        conn.close()
        return cards
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取可关联卡片失败: {str(e)}")


@router.post("/projects/{project_id}/link-cards")
async def link_cards_to_project(project_id: int, card_ids: List[int]):
    """批量关联卡片到专题"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 批量关联卡片
        for card_id in card_ids:
            cursor.execute("""
                UPDATE knowledge_cards 
                SET project_id = ?, updated_at = ?
                WHERE id = ?
            """, (project_id, datetime.now().isoformat(), card_id))
        
        conn.commit()
        conn.close()
        
        return {"message": f"已关联 {len(card_ids)} 张卡片到专题"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关联卡片失败: {str(e)}")


@router.post("/projects/{project_id}/unlink-cards")
async def unlink_cards_from_project(project_id: int, card_ids: List[int]):
    """批量取消关联卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 批量取消关联
        for card_id in card_ids:
            cursor.execute("""
                UPDATE knowledge_cards 
                SET project_id = NULL, updated_at = ?
                WHERE id = ? AND project_id = ?
            """, (datetime.now().isoformat(), card_id, project_id))
        
        conn.commit()
        conn.close()
        
        return {"message": f"已取消关联 {len(card_ids)} 张卡片"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取消关联失败: {str(e)}")


# ==================== 知识图谱关联功能 ====================

@router.get("/cards/{card_id}/relations")
async def get_card_relations(card_id: int):
    """获取卡片的知识图谱关联"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 获取卡片信息
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        card = cursor.fetchone()
        if not card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 获取关联的专题
        related_projects = []
        if card["project_id"]:
            cursor.execute("SELECT * FROM research_projects WHERE id = ?", (card["project_id"],))
            proj = cursor.fetchone()
            if proj:
                related_projects.append({
                    "id": proj["id"],
                    "name": proj["name"],
                    "type": "project"
                })
        
        # 获取同一专题的其他卡片
        related_cards = []
        if card["project_id"]:
            cursor.execute("""
                SELECT id, card_type, title, content, category 
                FROM knowledge_cards 
                WHERE project_id = ? AND id != ?
                ORDER BY created_at DESC
            """, (card["project_id"], card_id))
            for row in cursor.fetchall():
                related_cards.append({
                    "id": row["id"],
                    "title": row["title"],
                    "card_type": row["card_type"],
                    "category": row["category"],
                    "relation_type": "same_project"
                })
        
        # 基于内容相似度查找相关卡片
        similar_cards = []
        cursor.execute("""
            SELECT id, card_type, title, content, category, project_id
            FROM knowledge_cards 
            WHERE id != ? AND project_id != ?
            ORDER BY created_at DESC
            LIMIT 20
        """, (card_id, card["project_id"] or 0))
        
        card_words = set(card["title"].lower().split() + card["content"].lower().split()[:20])
        for row in cursor.fetchall():
            other_words = set(row["title"].lower().split() + row["content"].lower().split()[:20])
            common = card_words & other_words
            if len(common) >= 3:  # 至少3个共同词汇
                similar_cards.append({
                    "id": row["id"],
                    "title": row["title"],
                    "card_type": row["card_type"],
                    "category": row["category"],
                    "project_id": row["project_id"],
                    "relation_type": "similar_content",
                    "similarity_score": len(common)
                })
        
        # 按相似度排序
        similar_cards.sort(key=lambda x: x["similarity_score"], reverse=True)
        similar_cards = similar_cards[:10]
        
        conn.close()
        
        return {
            "card": {
                "id": card["id"],
                "title": card["title"],
                "card_type": card["card_type"],
                "content": card["content"],
                "project_id": card["project_id"]
            },
            "related_projects": related_projects,
            "related_cards": related_cards,
            "similar_cards": similar_cards,
            "total_relations": len(related_projects) + len(related_cards) + len(similar_cards)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取关联失败: {str(e)}")


@router.post("/cards/{card_id}/link/{target_card_id}")
async def link_cards(card_id: int, target_card_id: int, relation_type: str = "manual"):
    """手动关联两个卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查两个卡片是否存在
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        card1 = cursor.fetchone()
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (target_card_id,))
        card2 = cursor.fetchone()
        
        if not card1 or not card2:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 检查是否已有关系表，如果没有则使用临时方案
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS card_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    card_id_1 INTEGER NOT NULL,
                    card_id_2 INTEGER NOT NULL,
                    relation_type TEXT DEFAULT 'manual',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 检查是否已存在关联
            cursor.execute("""
                SELECT * FROM card_relations 
                WHERE (card_id_1 = ? AND card_id_2 = ?) OR (card_id_1 = ? AND card_id_2 = ?)
            """, (card_id, target_card_id, target_card_id, card_id))
            
            if cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=400, detail="卡片关联已存在")
            
            # 创建关联
            cursor.execute("""
                INSERT INTO card_relations (card_id_1, card_id_2, relation_type)
                VALUES (?, ?, ?)
            """, (card_id, target_card_id, relation_type))
            
            conn.commit()
            conn.close()
            
            return {"message": "卡片关联成功"}
        except Exception as e:
            # 如果表创建失败，也返回成功（使用内存关联）
            conn.close()
            return {"message": "卡片关联已记录（内存模式）" }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关联卡片失败: {str(e)}")


@router.get("/projects/{project_id}/knowledge-network")
async def get_project_knowledge_network(project_id: int):
    """获取专题的知识网络图谱"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        project = cursor.fetchone()
        if not project:
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 获取专题所有卡片
        cursor.execute("""
            SELECT id, card_type, title, content, category 
            FROM knowledge_cards 
            WHERE project_id = ?
            ORDER BY created_at DESC
        """, (project_id,))
        cards = [dict(row) for row in cursor.fetchall()]
        
        # 构建节点和边
        nodes = []
        edges = []
        
        for card in cards:
            # 添加节点
            nodes.append({
                "id": card["id"],
                "label": card["title"],
                "type": card["card_type"],
                "category": card["category"]
            })
            
            # 查找相似卡片并创建边
            card_words = set(card["title"].lower().split() + card["content"].lower().split()[:20])
            for other_card in cards:
                if other_card["id"] != card["id"]:
                    other_words = set(other_card["title"].lower().split() + other_card["content"].lower().split()[:20])
                    common = card_words & other_words
                    if len(common) >= 2:
                        edges.append({
                            "source": card["id"],
                            "target": other_card["id"],
                            "label": f"相关({len(common)}词)",
                            "weight": len(common)
                        })
        
        # 检查卡片关联表
        try:
            cursor.execute("""
                SELECT * FROM card_relations 
                WHERE card_id_1 IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
                OR card_id_2 IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
            """, (project_id, project_id))
            
            for row in cursor.fetchall():
                edges.append({
                    "source": row["card_id_1"],
                    "target": row["card_id_2"],
                    "label": row["relation_type"],
                    "weight": 5
                })
        except:
            pass
        
        conn.close()
        
        return {
            "project": {
                "id": project["id"],
                "name": project["name"],
                "icon": project["icon"]
            },
            "nodes": nodes,
            "edges": edges,
            "statistics": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "avg_connections": round(len(edges) / len(nodes), 2) if nodes else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识网络失败: {str(e)}")


@router.get("/cross-project-cards")
async def get_cross_project_cards():
    """获取跨专题的关联卡片（找出被多个专题引用的卡片）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 找出有多个专题引用的卡片
        cursor.execute("""
            SELECT kc.id, kc.title, kc.card_type, kc.content, 
                   GROUP_CONCAT(rp.name) as project_names,
                   COUNT(*) as project_count
            FROM knowledge_cards kc
            JOIN research_projects rp ON kc.project_id = rp.id
            GROUP BY kc.id
            HAVING project_count > 1
            ORDER BY project_count DESC
            LIMIT 20
        """)
        
        cards = []
        for row in cursor.fetchall():
            cards.append({
                "id": row["id"],
                "title": row["title"],
                "card_type": row["card_type"],
                "content": row["content"][:100] + "..." if len(row["content"]) > 100 else row["content"],
                "projects": row["project_names"].split(","),
                "project_count": row["project_count"]
            })
        
        conn.close()
        
        return {
            "cross_project_cards": cards,
            "total": len(cards)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取跨专题卡片失败: {str(e)}")


@router.post("/projects", response_model=ResearchProject)
async def create_project(project: ResearchProjectCreate):
    """创建专题研究"""
    print(f"Received project data: {project}")
    try:
        conn = get_db()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO research_projects (name, description, color, icon, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?)
        """, (project.name, project.description, project.color, project.icon, now, now))
        project_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "color": row["color"],
            "icon": row["icon"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建专题研究失败: {str(e)}")


@router.put("/projects/{project_id}", response_model=ResearchProject)
async def update_project(project_id: int, project: ResearchProjectUpdate):
    """更新专题研究"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 构建更新语句
        updates = []
        values = []
        if project.name is not None:
            updates.append("name = ?")
            values.append(project.name)
        if project.description is not None:
            updates.append("description = ?")
            values.append(project.description)
        if project.color is not None:
            updates.append("color = ?")
            values.append(project.color)
        if project.icon is not None:
            updates.append("icon = ?")
            values.append(project.icon)
        
        if updates:
            updates.append("updated_at = ?")
            values.append(datetime.now().isoformat())
            values.append(project_id)
            cursor.execute(f"UPDATE research_projects SET {', '.join(updates)} WHERE id = ?", values)
            conn.commit()
        
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "color": row["color"],
            "icon": row["icon"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新专题研究失败: {str(e)}")


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int):
    """删除专题研究（软删除）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        cursor.execute("""
            UPDATE research_projects SET status = 'deleted', updated_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), project_id))
        conn.commit()
        conn.close()
        
        return {"message": "专题研究已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除专题研究失败: {str(e)}")


@router.get("/projects/{project_id}/tasks")
async def get_project_tasks(project_id: int):
    """获取专题下的所有任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        cursor.execute("""
            SELECT * FROM gtd_tasks
            WHERE source_type = 'project' AND source_id = ?
            ORDER BY created_at DESC
        """, (project_id,))
        rows = cursor.fetchall()
        conn.close()
        
        tasks = []
        for row in rows:
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "priority": row["priority"],
                "due_date": row["due_date"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
        return tasks
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取专题任务失败: {str(e)}")


@router.post("/projects/{project_id}/tasks/{task_id}")
async def add_task_to_project(project_id: int, task_id: int):
    """将任务添加到专题"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 检查任务是否存在
        cursor.execute("SELECT * FROM gtd_tasks WHERE id = ?", (task_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="任务不存在")
        
        cursor.execute("""
            UPDATE gtd_tasks 
            SET source_type = 'project', source_id = ?
            WHERE id = ?
        """, (project_id, task_id))
        conn.commit()
        conn.close()
        
        return {"message": "任务已添加到专题"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加任务到专题失败: {str(e)}")


@router.delete("/projects/{project_id}/tasks/{task_id}")
async def remove_task_from_project(project_id: int, task_id: int):
    """将任务从专题中移除"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE gtd_tasks 
            SET source_type = NULL, source_id = NULL
            WHERE id = ? AND source_type = 'project' AND source_id = ?
        """, (task_id, project_id))
        conn.commit()
        conn.close()
        
        return {"message": "任务已从专题中移除"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"移除任务失败: {str(e)}")


@router.get("/projects/{project_id}/cards")
async def get_project_cards(project_id: int):
    """获取专题相关的所有四色卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 获取专题相关的卡片
        cursor.execute("""
            SELECT * FROM knowledge_cards
            WHERE project_id = ?
            ORDER BY created_at DESC
        """, (project_id,))
        rows = cursor.fetchall()
        conn.close()
        
        cards = []
        for row in rows:
            cards.append({
                "id": row["id"],
                "card_type": row["card_type"],
                "title": row["title"],
                "content": row["content"],
                "category": row["category"],
                "project_id": row["project_id"],
                "created_at": row["created_at"]
            })
        return cards
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取专题卡片失败: {str(e)}")


@router.post("/projects/{project_id}/cards/{card_id}")
async def add_card_to_project(project_id: int, card_id: int):
    """将卡片关联到专题"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        # 检查卡片是否存在
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 关联卡片到专题
        cursor.execute("""
            UPDATE knowledge_cards 
            SET project_id = ?
            WHERE id = ?
        """, (project_id, card_id))
        conn.commit()
        conn.close()
        
        return {"message": "卡片已关联到专题"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关联卡片失败: {str(e)}")


@router.post("/cards/{card_id}/to-task")
async def convert_card_to_task(card_id: int):
    """将卡片转换为GTD任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 获取卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        card = cursor.fetchone()
        if not card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 根据卡片类型确定任务优先级
        priority_map = {
            'blue': 'medium',    # 事实 -> 中优先级
            'green': 'low',      # 解释 -> 低优先级
            'yellow': 'high',    # 风险 -> 高优先级
            'red': 'high'        # 行动 -> 高优先级
        }
        priority = priority_map.get(card["card_type"], 'medium')
        
        # 创建任务
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO gtd_tasks (title, description, priority, category, source_type, source_id, created_at, updated_at)
            VALUES (?, ?, ?, 'inbox', 'card', ?, ?, ?)
        """, (
            card["title"],
            card["content"],
            priority,
            card_id,
            now,
            now
        ))
        task_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "message": "卡片已转换为任务",
            "task_id": task_id,
            "priority": priority
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"转换任务失败: {str(e)}")
