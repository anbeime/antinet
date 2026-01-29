"""
GTD 任务管理 API 路由
提供 GTD (Getting Things Done) 任务管理功能
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
from pathlib import Path

router = APIRouter(prefix="/api/gtd", tags=["GTD任务管理"])

# 数据库路径
DB_PATH = Path(__file__).parent.parent / "data" / "antinet.db"


class GTDTask(BaseModel):
    """GTD 任务模型"""
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category: str  # inbox, today, later, archive, projects
    priority: Optional[str] = "medium"  # low, medium, high
    due_date: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GTDTaskCreate(BaseModel):
    """创建 GTD 任务"""
    title: str
    description: Optional[str] = None
    category: str = "inbox"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None


class GTDTaskUpdate(BaseModel):
    """更新 GTD 任务"""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/tasks", response_model=List[GTDTask])
async def get_all_tasks():
    """获取所有 GTD 任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date, 
                   created_at, updated_at
            FROM gtd_tasks
            ORDER BY created_at DESC
        """)
        
        tasks = []
        for row in cursor.fetchall():
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
        
        conn.close()
        return tasks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务失败: {str(e)}")


@router.get("/tasks/category/{category}", response_model=List[GTDTask])
async def get_tasks_by_category(category: str):
    """按类别获取任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at
            FROM gtd_tasks
            WHERE category = ?
            ORDER BY created_at DESC
        """, (category,))
        
        tasks = []
        for row in cursor.fetchall():
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
        
        conn.close()
        return tasks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务失败: {str(e)}")


@router.get("/tasks/{task_id}", response_model=GTDTask)
async def get_task(task_id: int):
    """获取单个任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at
            FROM gtd_tasks
            WHERE id = ?
        """, (task_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "category": row["category"],
            "priority": row["priority"],
            "due_date": row["due_date"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务失败: {str(e)}")


@router.post("/tasks", response_model=GTDTask)
async def create_task(task: GTDTaskCreate):
    """创建新任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO gtd_tasks (title, description, category, priority, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            task.title,
            task.description,
            task.category,
            task.priority,
            task.due_date
        ))
        
        task_id = cursor.lastrowid
        conn.commit()
        
        # 获取创建的任务
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at
            FROM gtd_tasks
            WHERE id = ?
        """, (task_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "category": row["category"],
            "priority": row["priority"],
            "due_date": row["due_date"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建任务失败: {str(e)}")


@router.put("/tasks/{task_id}", response_model=GTDTask)
async def update_task(task_id: int, task: GTDTaskUpdate):
    """更新任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查任务是否存在
        cursor.execute("SELECT id FROM gtd_tasks WHERE id = ?", (task_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 构建更新语句
        update_fields = []
        update_values = []
        
        if task.title is not None:
            update_fields.append("title = ?")
            update_values.append(task.title)
        
        if task.description is not None:
            update_fields.append("description = ?")
            update_values.append(task.description)
        
        if task.category is not None:
            update_fields.append("category = ?")
            update_values.append(task.category)
        
        if task.priority is not None:
            update_fields.append("priority = ?")
            update_values.append(task.priority)
        
        if task.due_date is not None:
            update_fields.append("due_date = ?")
            update_values.append(task.due_date)
        
        update_fields.append("updated_at = datetime('now')")
        update_values.append(task_id)
        
        if update_fields:
            sql = f"UPDATE gtd_tasks SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(sql, update_values)
            conn.commit()
        
        # 获取更新后的任务
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at
            FROM gtd_tasks
            WHERE id = ?
        """, (task_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "category": row["category"],
            "priority": row["priority"],
            "due_date": row["due_date"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新任务失败: {str(e)}")


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    """删除任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查任务是否存在
        cursor.execute("SELECT id FROM gtd_tasks WHERE id = ?", (task_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 删除任务
        cursor.execute("DELETE FROM gtd_tasks WHERE id = ?", (task_id,))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "任务已删除"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除任务失败: {str(e)}")


@router.get("/stats")
async def get_stats():
    """获取 GTD 统计信息"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 统计各类别任务数
        cursor.execute("""
            SELECT category, COUNT(*) as count
            FROM gtd_tasks
            GROUP BY category
        """)
        
        stats = {}
        for row in cursor.fetchall():
            stats[row["category"]] = row["count"]
        
        # 统计优先级
        cursor.execute("""
            SELECT priority, COUNT(*) as count
            FROM gtd_tasks
            GROUP BY priority
        """)
        
        priority_stats = {}
        for row in cursor.fetchall():
            priority_stats[row["priority"]] = row["count"]
        
        # 总任务数
        cursor.execute("SELECT COUNT(*) as total FROM gtd_tasks")
        total = cursor.fetchone()["total"]
        
        conn.close()
        
        return {
            "total": total,
            "by_category": stats,
            "by_priority": priority_stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.get("/health")
async def health_check():
    """健康检查"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM gtd_tasks")
        count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "tasks_count": count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
