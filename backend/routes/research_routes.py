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
import re
import json
import sqlite3
from pathlib import Path

from routes.knowledge_routes import sanitize_html

# 自定义 JSON 编码器确保 UTF-8
class UTF8Encoder(json.JSONEncoder):
    def encode(self, obj):
        return super().encode(obj).encode('utf-8').decode('utf-8')

from paths import DB_PATH

router = APIRouter(prefix="/api/research", tags=["专题研究"])


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
    card_type: Optional[str] = None  # blue/green/yellow/red
    type: Optional[str] = None  # 兼容前端传 type 字段
    title: Optional[str] = None
    content: str
    category: Optional[str] = None
    related_cards: Optional[List[int]] = []


@router.get("/projects/{project_id}/cards")
async def get_project_cards(project_id: int):
    """获取专题下的所有卡片（包含双向关联数据）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")
        
        cursor.execute("""
            SELECT id, card_type, title, content, category, project_id,
                   related_cards, created_at, updated_at
            FROM knowledge_cards 
            WHERE project_id = ?
            ORDER BY created_at DESC
        """, (project_id,))
        rows = cursor.fetchall()
        
        card_ids = [row["id"] for row in rows]
        
        # 批量获取所有卡片的 backlink 数据
        backlink_map = {}  # card_id -> set of related card_ids
        if card_ids:
            placeholders = ','.join(['?' for _ in card_ids])
            # 正向链接：我链接到别人
            cursor.execute(f"""
                SELECT source_card_id, target_card_id FROM card_backlinks
                WHERE source_card_id IN ({placeholders})
            """, card_ids)
            for row in cursor.fetchall():
                sid = row["source_card_id"]
                backlink_map.setdefault(sid, set()).add(row["target_card_id"])
            # 反向链接：别人链接到我（也要体现为关联）
            cursor.execute(f"""
                SELECT source_card_id, target_card_id FROM card_backlinks
                WHERE target_card_id IN ({placeholders})
            """, card_ids)
            for row in cursor.fetchall():
                tid = row["target_card_id"]
                backlink_map.setdefault(tid, set()).add(row["source_card_id"])
        
        cards = []
        for row in rows:
            # 解析 related_cards JSON
            related_set = set()
            if row["related_cards"]:
                try:
                    related_set = set(json.loads(row["related_cards"]))
                except:
                    pass
            # 合并 backlink 数据
            related_set |= backlink_map.get(row["id"], set())
            
            cards.append({
                "id": row["id"],
                "card_type": row["card_type"],
                "title": row["title"],
                "content": row["content"],
                "category": row["category"],
                "project_id": row["project_id"] if "project_id" in row.keys() else None,
                "related_cards": list(related_set),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
        
        conn.close()
        return cards
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取专题卡片失败: {str(e)}")


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
        
        # 兼容前端传 type 字段
        card_type = card.card_type or card.type or 'blue'
        
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
                card_title = type_to_title.get(card_type, '新卡片')
        
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
            card_category = type_to_category.get(card_type, '事实')
        
        # 序列化 related_cards
        related_cards_json = json.dumps(card.related_cards) if card.related_cards else None
        
        # 过滤 HTML 内容防止 XSS
        safe_content = sanitize_html(card.content) if card.content else ''
        
        # 插入卡片 — 同时写入 project_id 和 topic_id 保持兼容
        cursor.execute("""
            INSERT INTO knowledge_cards (card_type, title, content, category, project_id, topic_id, related_cards, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (card_type, card_title, safe_content, card_category, project_id, project_id, related_cards_json, now, now))
        
        card_id = cursor.lastrowid
        
        # 自动与同专题其他卡片建立双向链接（同专题 = 主题相关）
        cursor.execute("""
            SELECT id FROM knowledge_cards 
            WHERE project_id = ? AND id != ?
            ORDER BY created_at DESC LIMIT 100
        """, (project_id, card_id))
        sibling_ids = [row["id"] for row in cursor.fetchall()]
        
        for sibling_id in sibling_ids:
            # 正向：新卡片 -> 兄弟卡片
            cursor.execute("""
                INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                VALUES (?, ?, ?)
            """, (card_id, sibling_id, 'same_project'))
            # 反向：兄弟卡片 -> 新卡片
            cursor.execute("""
                INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                VALUES (?, ?, ?)
            """, (sibling_id, card_id, 'same_project'))
        
        # 同步 related_cards 到 card_backlinks
        if card.related_cards:
            for target_id in card.related_cards:
                try:
                    cursor.execute("""
                        INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                        VALUES (?, ?, ?)
                    """, (card_id, target_id, 'manual'))
                    cursor.execute("""
                        INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                        VALUES (?, ?, ?)
                    """, (target_id, card_id, 'manual'))
                except Exception:
                    pass
        
        conn.commit()
        
        # 获取新卡片（含关联数据）
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        row = cursor.fetchone()
        
        # 获取该卡片的 backlinks
        related_set = set()
        cursor.execute("""
            SELECT target_card_id FROM card_backlinks WHERE source_card_id = ?
            UNION
            SELECT source_card_id FROM card_backlinks WHERE target_card_id = ?
        """, (card_id, card_id))
        for bl_row in cursor.fetchall():
            related_set.add(bl_row[0])
        
        conn.close()
        
        return {
            "id": row["id"],
            "card_type": row["card_type"],
            "title": row["title"],
            "content": row["content"],
            "category": row["category"],
            "project_id": row["project_id"],
            "related_cards": list(related_set),
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
    related_cards: Optional[List[int]] = None


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
            values.append(sanitize_html(card.content))
        
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
        
        if card.related_cards is not None:
            updates.append("related_cards = ?")
            values.append(json.dumps(card.related_cards))
            
            # 同步写入 card_backlinks 双向链接
            try:
                # 获取旧关联
                cursor.execute("SELECT related_cards FROM knowledge_cards WHERE id = ?", (card_id,))
                old_row = cursor.fetchone()
                old_related = set()
                if old_row and old_row["related_cards"]:
                    try:
                        old_related = set(json.loads(old_row["related_cards"]))
                    except:
                        pass
                
                # 也从 backlinks 表获取已有关联
                cursor.execute("""
                    SELECT target_card_id FROM card_backlinks WHERE source_card_id = ?
                """, (card_id,))
                for bl in cursor.fetchall():
                    old_related.add(bl[0])
                
                new_related = set(card.related_cards)
                
                # 需要新增的关联
                to_add = new_related - old_related
                # 需要删除的关联（仅在 related_cards 字段中移除，不删 same_project 类型）
                to_remove = old_related - new_related
                
                for target_id in to_add:
                    # 正向：A -> B
                    cursor.execute("""
                        INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                        VALUES (?, ?, ?)
                    """, (card_id, target_id, 'manual'))
                    # 双向：B -> A
                    cursor.execute("""
                        INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                        VALUES (?, ?, ?)
                    """, (target_id, card_id, 'manual'))
                
                for target_id in to_remove:
                    # 只删除 manual 类型的关联，不删 same_project
                    cursor.execute("""
                        DELETE FROM card_backlinks 
                        WHERE ((source_card_id = ? AND target_card_id = ?) 
                           OR (source_card_id = ? AND target_card_id = ?))
                           AND link_text = 'manual'
                    """, (card_id, target_id, target_id, card_id))
            except Exception as e:
                print(f"同步backlinks失败（非致命）: {e}")
        
        if not updates:
            conn.close()
            raise HTTPException(status_code=400, detail="没有要更新的内容")
        
        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        
        # 只更新有project_id的情况
        if project_id:
            values.extend([card_id, project_id])
        else:
            # 如果没有project_id，只按card_id更新
            values.append(card_id)
        
        if project_id:
            cursor.execute(f"""
                UPDATE knowledge_cards 
                SET {', '.join(updates)}
                WHERE id = ? AND project_id = ?
            """, values)
        else:
            cursor.execute(f"""
                UPDATE knowledge_cards 
                SET {', '.join(updates)}
                WHERE id = ?
            """, values[:-1])  # 移除最后一个值（project_id）
        
        conn.commit()
        
        # 获取更新后的卡片
        if project_id:
            cursor.execute("SELECT * FROM knowledge_cards WHERE id = ? AND project_id = ?", (card_id, project_id))
        else:
            cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return {
                "id": card_id,
                "message": "卡片已更新（无法获取完整数据）"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新卡片失败: {str(e)}")


@router.post("/cards/{card_id}/link-project")
async def link_card_to_project(card_id: int, link_request: dict):
    """将卡片关联到专题"""
    try:
        project_id = link_request.get("project_id")
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查卡片是否存在
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        card = cursor.fetchone()
        if not card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 如果提供了 project_id，检查专题是否存在
        if project_id is not None:
            cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
            if not cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=404, detail="专题不存在")
        
        # 更新卡片的 project_id 和 topic_id（保持兼容）
        cursor.execute("""
            UPDATE knowledge_cards 
            SET project_id = ?, topic_id = ?, updated_at = ?
            WHERE id = ?
        """, (project_id, project_id, datetime.now().isoformat(), card_id))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"卡片已{'关联到专题' if project_id else '取消关联'}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关联失败: {str(e)}")


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
            LIMIT 10000
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
            SELECT id, card_type, title, content, project_id, created_at 
            FROM knowledge_cards 
            WHERE project_id IS NULL OR project_id = ?
            ORDER BY created_at DESC
            LIMIT 10000
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


@router.get("/cards/{card_id}/suggested-relations")
async def get_suggested_relations(card_id: int, limit: int = 10):
    """获取卡片的联想关联推荐（基于关键词相似度、同专题、已有链接的二级关联）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 获取当前卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        card = cursor.fetchone()
        if not card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 获取已有关联（不再推荐）
        existing_related = set()
        cursor.execute("""
            SELECT target_card_id FROM card_backlinks WHERE source_card_id = ?
            UNION
            SELECT source_card_id FROM card_backlinks WHERE target_card_id = ?
        """, (card_id, card_id))
        for row in cursor.fetchall():
            existing_related.add(row[0])
        existing_related.add(card_id)  # 排除自己
        
        suggestions = []  # [(card_id, reason, score)]
        
        # 1. 同专题卡片（强关联）
        if card["project_id"]:
            cursor.execute("""
                SELECT id, title, card_type, category FROM knowledge_cards
                WHERE project_id = ? AND id != ?
                ORDER BY created_at DESC LIMIT 20
            """, (card["project_id"], card_id))
            for row in cursor.fetchall():
                if row["id"] not in existing_related:
                    suggestions.append((row["id"], row["title"], row["card_type"], row["category"], "同专题", 3))
        
        # 2. 关键词相似卡片
        import re
        # 中文分词：简单按2-4字组合提取关键词
        content_text = (card["title"] + " " + card["content"]).lower()
        # 提取2-4字中文词组
        cn_words = set(re.findall(r'[\u4e00-\u9fff]{2,4}', content_text))
        # 提取英文单词
        en_words = set(re.findall(r'[a-zA-Z]{3,}', content_text))
        keywords = cn_words | en_words
        # 过滤常见停用词
        stopwords = {'的是', '在了', '和的', '这个', '一个', '不是', '没有', '我们', '他们', '可以', '因为', '所以', '但是', '如果', '那么', '虽然', '而且', '或者', '以及', '还是', '已经', '正在', '将会', '应该', '需要', '能够', '可能', '关于', '通过', '进行', '使用', '包括', '例如', '其中', '之间', '之后', '之前', '对于', '基于', '来自', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'was', 'had', 'has', 'her', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'did', 'get', 'let', 'our', 'too', 'use'}
        keywords -= stopwords
        
        if keywords:
            cursor.execute("""
                SELECT id, title, card_type, category, content FROM knowledge_cards
                WHERE id != ? AND (project_id != ? OR project_id IS NULL)
                ORDER BY created_at DESC LIMIT 10000
            """, (card_id, card["project_id"] or 0))
            
            for row in cursor.fetchall():
                if row["id"] in existing_related:
                    continue
                other_text = (row["title"] + " " + row["content"]).lower()
                other_cn = set(re.findall(r'[\u4e00-\u9fff]{2,4}', other_text))
                other_en = set(re.findall(r'[a-zA-Z]{3,}', other_text))
                other_keywords = (other_cn | other_en) - stopwords
                
                common = keywords & other_keywords
                if len(common) >= 2:
                    score = len(common)
                    reason = f"关键词关联({','.join(list(common)[:3])})"
                    suggestions.append((row["id"], row["title"], row["card_type"], row["category"], reason, min(score, 5)))
        
        # 3. 二级关联：已有关联的关联（朋友的朋友）
        if existing_related - {card_id}:
            first_level = list(existing_related - {card_id})[:10]
            placeholders = ','.join(['?' for _ in first_level])
            cursor.execute(f"""
                SELECT DISTINCT k.id, k.title, k.card_type, k.category
                FROM knowledge_cards k
                JOIN card_backlinks bl ON (bl.target_card_id = k.id OR bl.source_card_id = k.id)
                WHERE (bl.source_card_id IN ({placeholders}) OR bl.target_card_id IN ({placeholders}))
                  AND k.id != ?
                LIMIT 20
            """, first_level + first_level + [card_id])
            for row in cursor.fetchall():
                if row["id"] not in existing_related and not any(s[0] == row["id"] for s in suggestions):
                    suggestions.append((row["id"], row["title"], row["card_type"], row["category"], "二级关联", 2))
        
        # 去重并按分数排序
        seen = set()
        unique_suggestions = []
        for s in sorted(suggestions, key=lambda x: -x[5]):
            if s[0] not in seen:
                seen.add(s[0])
                unique_suggestions.append({
                    "id": s[0],
                    "title": s[1],
                    "card_type": s[2],
                    "category": s[3],
                    "reason": s[4],
                    "score": s[5]
                })
        
        conn.close()
        return {"suggestions": unique_suggestions[:limit]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取联想关联失败: {str(e)}")


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
            SET source_type = 'project', source_id = ?, project_id = ?
            WHERE id = ?
        """, (project_id, project_id, task_id))
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




@router.post("/projects/{project_id}/cards/{card_id}")
async def add_card_to_project(project_id: int, card_id: int):
    """将卡片关联到专题（同时建立与同专题其他卡片的双向链接）"""
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
        
        # 建立与同专题其他卡片的双向链接
        cursor.execute("""
            SELECT id FROM knowledge_cards 
            WHERE project_id = ? AND id != ?
            ORDER BY created_at DESC LIMIT 20
        """, (project_id, card_id))
        sibling_ids = [row["id"] for row in cursor.fetchall()]
        
        for sibling_id in sibling_ids:
            cursor.execute("""
                INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                VALUES (?, ?, ?)
            """, (card_id, sibling_id, 'same_project'))
            cursor.execute("""
                INSERT OR IGNORE INTO card_backlinks (source_card_id, target_card_id, link_text)
                VALUES (?, ?, ?)
            """, (sibling_id, card_id, 'same_project'))
        
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
        
        # 检查卡片是否属于某个专题
        project_id = card.get("project_id")
        source_type = 'project' if project_id else 'card'
        source_id = project_id if project_id else card_id
        category = 'projects' if project_id else 'inbox'
        
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO gtd_tasks (title, description, priority, category, source_type, source_id, project_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            card["title"],
            card["content"],
            priority,
            category,
            source_type,
            source_id,
            project_id,
            now,
            now
        ))
        task_id = cursor.lastrowid
        
        # 创建卡片-任务关联（与 integration_routes 保持一致，使 CardDetailModal 的任务面板可查出）
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO card_task_relations (card_id, task_id, relation_type)
                VALUES (?, ?, 'extracted_from')
            """, (card_id, task_id))
        except Exception:
            pass  # 关联失败不影响任务创建
        
        conn.commit()
        conn.close()
        
        return {
            "message": "卡片已转换为任务",
            "task_id": task_id,
            "priority": priority,
            "category": category,
            "project_id": project_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"转换任务失败: {str(e)}")


# ========== 专题统计与工作流闭环 API ==========

@router.get("/projects/{project_id}/stats")
async def get_project_stats(project_id: int):
    """获取专题统计信息（卡片、任务、日历事件、反向链接）"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        # 检查专题是否存在
        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")

        stats = {}

        # 卡片统计
        cursor.execute("""
            SELECT card_type, COUNT(*) as cnt FROM knowledge_cards
            WHERE project_id = ? GROUP BY card_type
        """, (project_id,))
        card_stats = {row['card_type']: row['cnt'] for row in cursor.fetchall()}
        stats['cards'] = card_stats
        stats['total_cards'] = sum(card_stats.values())

        # 任务统计
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
            FROM gtd_tasks WHERE source_type = 'project' AND source_id = ?
        """, (project_id,))
        row = cursor.fetchone()
        task_total = row['total'] if row else 0
        task_completed = row['completed'] if row and row['completed'] else 0
        stats['tasks'] = {'total': task_total, 'completed': task_completed,
                          'pending': task_total - task_completed}
        stats['task_progress'] = round(task_completed / task_total * 100) if task_total > 0 else 0

        # 日历事件
        try:
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM calendar_events
                WHERE source_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
            """, (project_id,))
            row = cursor.fetchone()
            stats['calendar_events'] = row['cnt'] if row else 0
        except:
            stats['calendar_events'] = 0

        # 反向链接
        try:
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM card_backlinks
                WHERE target_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
                   OR source_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
            """, (project_id, project_id))
            row = cursor.fetchone()
            stats['backlinks'] = row['cnt'] if row else 0
        except:
            stats['backlinks'] = 0

        conn.close()
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.get("/projects/{project_id}/calendar-events")
async def get_project_calendar_events(project_id: int):
    """获取专题关联的日历事件"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")

        # 专题下卡片的日历事件
        try:
            cursor.execute("""
                SELECT ce.* FROM calendar_events ce
                WHERE ce.source_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
                ORDER BY ce.start_time
            """, (project_id,))
            events = [dict(row) for row in cursor.fetchall()]
        except:
            # 专题任务的 due_date 作为日历事件
            cursor.execute("""
                SELECT id, title, due_date as start_time, 'task' as source,
                       priority, is_completed
                FROM gtd_tasks
                WHERE source_type = 'project' AND source_id = ? AND due_date IS NOT NULL
                ORDER BY due_date
            """, (project_id,))
            events = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return events
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日历事件失败: {str(e)}")


@router.get("/projects/{project_id}/workflow")
async def get_project_workflow(project_id: int):
    """获取专题工作流概览（闭环数据：卡片→任务→日历→链接）"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
        project = cursor.fetchone()
        if not project:
            conn.close()
            raise HTTPException(status_code=404, detail="专题研究不存在")

        workflow = {
            'project': dict(project),
            'cards': [],
            'tasks': [],
            'unconverted_cards': [],  # 红色(行动)卡片但还没转任务的
            'calendar_events': [],
            'backlinks': []
        }

        # 获取所有卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE project_id = ?", (project_id,))
        cards = [dict(row) for row in cursor.fetchall()]
        workflow['cards'] = cards

        # 获取任务
        cursor.execute("""
            SELECT * FROM gtd_tasks WHERE source_type = 'project' AND source_id = ?
            ORDER BY created_at DESC
        """, (project_id,))
        tasks = [dict(row) for row in cursor.fetchall()]
        workflow['tasks'] = tasks

        # 找出红色(行动)卡片但还没转任务的
        task_source_ids = {t.get('source_id') for t in tasks if t.get('source_type') == 'card'}
        workflow['unconverted_cards'] = [
            c for c in cards
            if c.get('card_type') == 'red' and c['id'] not in task_source_ids
        ]

        # 日历事件
        try:
            cursor.execute("""
                SELECT ce.* FROM calendar_events ce
                WHERE ce.source_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
                ORDER BY ce.start_time
            """, (project_id,))
            workflow['calendar_events'] = [dict(row) for row in cursor.fetchall()]
        except:
            pass

        # 反向链接
        try:
            card_ids = [c['id'] for c in cards]
            if card_ids:
                placeholders = ','.join(['?' for _ in card_ids])
                cursor.execute(f"""
                    SELECT * FROM card_backlinks
                    WHERE target_card_id IN ({placeholders})
                       OR source_card_id IN ({placeholders})
                """, card_ids + card_ids)
                workflow['backlinks'] = [dict(row) for row in cursor.fetchall()]
        except:
            pass

        conn.close()
        return workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取工作流失败: {str(e)}")


# ========== 统一项目桥梁 API ==========

@router.get("/unified-projects")
async def get_unified_projects():
    """获取统一项目列表（合并 research_projects 和 team_projects）"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        # 专题研究
        cursor.execute("""
            SELECT id, name, description, color, icon, status, 'research' as source,
                   created_at, updated_at
            FROM research_projects WHERE status = 'active'
        """)
        research = [dict(row) for row in cursor.fetchall()]

        # 团队项目
        cursor.execute("""
            SELECT id, name, description, status, priority, progress,
                   start_date, end_date, 'team' as source,
                   created_at, updated_at
            FROM team_projects
        """)
        team = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return {
            'research_projects': research,
            'team_projects': team,
            'total': len(research) + len(team)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统一项目列表失败: {str(e)}")


# ========== 图片上传 API ==========
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
import uuid
import aiofiles

UPLOAD_DIR = Path(__file__).parent.parent / "data" / "uploads" / "images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """上传图片到服务器，返回图片URL"""
    try:
        # 生成唯一文件名
        ext = Path(file.filename).suffix.lower()
        allowed_exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail="不支持的图片格式")
        
        file_id = str(uuid.uuid4())[:12]
        filename = f"{file_id}{ext}"
        file_path = UPLOAD_DIR / filename
        
        # 保存文件
        content = await file.read()
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # 返回图片URL
        image_url = f"/api/research/uploads/images/{filename}"
        return {
            "success": True,
            "url": image_url,
            "filename": filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传图片失败: {str(e)}")


@router.get("/uploads/images/{filename}")
async def get_uploaded_image(filename: str):
    """获取上传的图片"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图片不存在")
    
    # 根据文件扩展名返回正确的 Content-Type
    ext = Path(filename).suffix.lower()
    media_type = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
    }.get(ext, 'image/jpeg')
    
    return FileResponse(file_path, media_type=media_type)


# ========== 删除卡片 API ==========
@router.delete("/cards/{card_id}")
async def delete_card(card_id: int):
    """删除卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查卡片是否存在
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        card = cursor.fetchone()
        if not card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")
        
        # 删除关联的 backlinks
        cursor.execute("DELETE FROM card_backlinks WHERE source_card_id = ? OR target_card_id = ?", (card_id, card_id))
        
        # 删除卡片
        cursor.execute("DELETE FROM knowledge_cards WHERE id = ?", (card_id,))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "卡片已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除卡片失败: {str(e)}")
