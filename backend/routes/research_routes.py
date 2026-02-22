"""
专题研究 API 路由
提供专题研究管理功能
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
from pathlib import Path

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
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
