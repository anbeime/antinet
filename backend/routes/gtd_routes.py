"""
GTD 任务管理 API 路由
提供 GTD (Getting Things Done) 任务管理功能
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

from paths import DB_PATH

router = APIRouter(prefix="/api/data/gtd", tags=["GTD任务管理"])


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
    remind_at: Optional[str] = None
    remind_before_minutes: Optional[int] = 0
    reminder_enabled: Optional[bool] = False
    recurrence: Optional[str] = "none"
    recurrence_end_date: Optional[str] = None
    is_completed: Optional[bool] = False
    completed_at: Optional[str] = None


class GTDTaskCreate(BaseModel):
    """创建 GTD 任务"""
    title: str
    description: Optional[str] = None
    category: str = "inbox"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    remind_at: Optional[str] = None
    remind_before_minutes: Optional[int] = 0
    reminder_enabled: Optional[bool] = False
    recurrence: Optional[str] = "none"
    recurrence_end_date: Optional[str] = None


class GTDTaskUpdate(BaseModel):
    """更新 GTD 任务"""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    remind_at: Optional[str] = None
    remind_before_minutes: Optional[int] = None
    reminder_enabled: Optional[bool] = None
    recurrence: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    is_completed: Optional[bool] = None
    project_id: Optional[int] = None


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
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
                   created_at, updated_at, remind_at, remind_before_minutes, project_id,
                   reminder_enabled, recurrence, recurrence_end_date,
                   is_completed, completed_at, assigned_to, assigned_to_name
            FROM gtd_tasks
            ORDER BY is_completed ASC, 
                     CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                     due_date ASC
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
                "updated_at": row["updated_at"],
                "remind_at": row["remind_at"],
                "remind_before_minutes": row["remind_before_minutes"],
                "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
                "recurrence": row["recurrence"] or "none",
                "recurrence_end_date": row["recurrence_end_date"],
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "completed_at": row["completed_at"],
                "project_id": row["project_id"],
                "assigned_to": row["assigned_to"],
                "assigned_to_name": row["assigned_to_name"]
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
                   created_at, updated_at, remind_at, remind_before_minutes, project_id,
                   reminder_enabled, recurrence, recurrence_end_date,
                   is_completed, completed_at
            FROM gtd_tasks
            WHERE category = ?
            ORDER BY is_completed ASC, 
                     CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                     due_date ASC
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
                "updated_at": row["updated_at"],
                "remind_at": row["remind_at"],
                "remind_before_minutes": row["remind_before_minutes"],
                "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
                "recurrence": row["recurrence"] or "none",
                "recurrence_end_date": row["recurrence_end_date"],
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "completed_at": row["completed_at"],
                "project_id": row["project_id"],
                "assigned_to": row["assigned_to"],
                "assigned_to_name": row["assigned_to_name"]
            })
        
        conn.close()
        return tasks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务失败: {str(e)}")


@router.get("/tasks/{task_id:int}", response_model=GTDTask)
async def get_task(task_id: int):
    """获取单个任务"""
    try:
        task_id_int = int(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="任务ID必须是整数")
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at, remind_at, remind_before_minutes, project_id,
                   reminder_enabled, recurrence, recurrence_end_date,
                   is_completed, completed_at
            FROM gtd_tasks
            WHERE id = ?
        """, (task_id_int,))
        
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
            "updated_at": row["updated_at"],
            "remind_at": row["remind_at"],
            "remind_before_minutes": row["remind_before_minutes"],
            "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
            "recurrence": row["recurrence"] or "none",
            "recurrence_end_date": row["recurrence_end_date"],
            "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
            "completed_at": row["completed_at"],
                    "project_id": row["project_id"],
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
            INSERT INTO gtd_tasks (title, description, category, priority, due_date, 
                                 remind_at, remind_before_minutes, reminder_enabled,
                                 recurrence, recurrence_end_date, is_completed,
                                 created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
        """, (
            task.title,
            task.description,
            task.category,
            task.priority,
            task.due_date,
            task.remind_at,
            task.remind_before_minutes,
            1 if task.reminder_enabled else 0,
            task.recurrence or "none",
            task.recurrence_end_date
        ))
        
        task_id = cursor.lastrowid
        conn.commit()
        
        # 获取创建的任务
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at, remind_at, remind_before_minutes, project_id,
                   reminder_enabled, recurrence, recurrence_end_date,
                   is_completed, completed_at
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
            "updated_at": row["updated_at"],
            "remind_at": row["remind_at"],
            "remind_before_minutes": row["remind_before_minutes"],
            "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
            "recurrence": row["recurrence"] or "none",
            "recurrence_end_date": row["recurrence_end_date"],
            "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
            "completed_at": row["completed_at"],
                    "project_id": row["project_id"],
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
        
        if task.remind_at is not None:
            update_fields.append("remind_at = ?")
            update_values.append(task.remind_at)
        
        if task.remind_before_minutes is not None:
            update_fields.append("remind_before_minutes = ?")
            update_values.append(task.remind_before_minutes)
        
        if task.reminder_enabled is not None:
            update_fields.append("reminder_enabled = ?")
            update_values.append(1 if task.reminder_enabled else 0)
        
        if task.recurrence is not None:
            update_fields.append("recurrence = ?")
            update_values.append(task.recurrence)
        
        if task.recurrence_end_date is not None:
            update_fields.append("recurrence_end_date = ?")
            update_values.append(task.recurrence_end_date)
        
        
            if task.is_completed is not None:
                update_fields.append("is_completed = ?")
                update_values.append(1 if task.is_completed else 0)
                if task.is_completed:
                    update_fields.append("completed_at = datetime('now')")
                else:
                    update_fields.append("completed_at = NULL")
        
        if task.project_id is not None:
            update_fields.append("project_id = ?")
            update_values.append(task.project_id)
        
        update_fields.append("updated_at = datetime('now')")
        update_values.append(task_id)
        if update_fields:
            sql = f"UPDATE gtd_tasks SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(sql, update_values)
            conn.commit()
        
        # 获取更新后的任务
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at, remind_at, remind_before_minutes, project_id,
                   reminder_enabled, recurrence, recurrence_end_date,
                   is_completed, completed_at
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
            "updated_at": row["updated_at"],
            "remind_at": row["remind_at"],
            "remind_before_minutes": row["remind_before_minutes"],
            "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
            "recurrence": row["recurrence"] or "none",
            "recurrence_end_date": row["recurrence_end_date"],
            "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
            "completed_at": row["completed_at"],
                    "project_id": row["project_id"],
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


@router.get("/tasks/calendar")
async def get_tasks_by_date_range(start_date: str, end_date: str):
    """获取指定日期范围内的任务（用于日历视图）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   remind_at, reminder_enabled, is_completed,
                   created_at, updated_at, remind_before_minutes,
                   recurrence, project_id, completed_at
            FROM gtd_tasks
            WHERE (due_date BETWEEN ? AND ?)
               OR (remind_at BETWEEN ? AND ?)
               OR (due_date IS NULL AND remind_at IS NULL)
            ORDER BY 
                CASE WHEN due_date IS NOT NULL THEN due_date ELSE remind_at END ASC,
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
        """, (start_date, end_date, start_date, end_date))
        
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "priority": row["priority"],
                "due_date": row["due_date"],
                "remind_at": row["remind_at"],
                "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "remind_before_minutes": row["remind_before_minutes"],
                "recurrence": row["recurrence"] or "none",
                "completed_at": row["completed_at"],
                "project_id": row["project_id"]
            })
        
        conn.close()
        return {
            "start_date": start_date,
            "end_date": end_date,
            "tasks": tasks,
            "total": len(tasks)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日历任务失败: {str(e)}")


@router.get("/tasks/today")
async def get_today_tasks():
    """获取今日任务"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   remind_at, reminder_enabled, is_completed,
                   created_at, updated_at, remind_before_minutes, project_id,
                   recurrence, completed_at
            FROM gtd_tasks
            WHERE is_completed = 0
              AND (due_date = ? OR category = 'today'
                   OR (reminder_enabled = 1 
                       AND DATE(remind_at) = ?))
            ORDER BY 
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                due_date ASC
        """, (today, today))
        
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "priority": row["priority"],
                "due_date": row["due_date"],
                "remind_at": row["remind_at"],
                "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "remind_before_minutes": row["remind_before_minutes"],
                "recurrence": row["recurrence"] or "none",
                "completed_at": row["completed_at"],
                "project_id": row["project_id"]
            })
        
        conn.close()
        return {"date": today, "tasks": tasks, "total": len(tasks)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取今日任务失败: {str(e)}")


@router.get("/tasks/upcoming")
async def get_upcoming_tasks(days: int = 7):
    """获取即将到期的任务"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   remind_at, reminder_enabled, is_completed,
                   created_at, updated_at, remind_before_minutes, project_id,
                   recurrence, completed_at
            FROM gtd_tasks
            WHERE is_completed = 0
              AND due_date BETWEEN ? AND ?
            ORDER BY due_date ASC,
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
        """, (today, end_date))
        
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "priority": row["priority"],
                "due_date": row["due_date"],
                "remind_at": row["remind_at"],
                "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "remind_before_minutes": row["remind_before_minutes"],
                "recurrence": row["recurrence"] or "none",
                "completed_at": row["completed_at"],
                "project_id": row["project_id"]
            })
        
        conn.close()
        return {"days": days, "tasks": tasks, "total": len(tasks)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取即将到期任务失败: {str(e)}")


@router.get("/tasks/project/{project_id}")
async def get_tasks_by_project(project_id: int):
    """按项目获取任务（看板数据源）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   created_at, updated_at, is_completed, completed_at,
                   project_id, assigned_to, assigned_to_name,
                   source_card_id, source_type, source_id, kanban_status
            FROM gtd_tasks
            WHERE project_id = ?
            ORDER BY kanban_status, 
                     CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                     due_date ASC
        """, (project_id,))
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
                "updated_at": row["updated_at"],
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "completed_at": row["completed_at"],
                "project_id": row["project_id"],
                "assigned_to": row["assigned_to"],
                "assigned_to_name": row["assigned_to_name"],
                "source_card_id": row["source_card_id"],
                "source_type": row["source_type"],
                "source_id": row["source_id"],
                "kanban_status": row["kanban_status"] or "backlog"
            })
        conn.close()
        return {"project_id": project_id, "tasks": tasks, "total": len(tasks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目任务失败: {str(e)}")


@router.put("/tasks/{task_id}/kanban-status")
async def update_kanban_status(task_id: int, kanban_status: str):
    """更新任务看板状态"""
    valid_statuses = {"backlog", "todo", "in_progress", "review", "done"}
    if kanban_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态: {kanban_status}")
    try:
        conn = get_db()
        cursor = conn.cursor()
        if kanban_status == "done":
            cursor.execute("UPDATE gtd_tasks SET kanban_status = ?, is_completed = 1, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", (kanban_status, task_id))
        else:
            cursor.execute("UPDATE gtd_tasks SET kanban_status = ?, is_completed = 0, updated_at = datetime('now') WHERE id = ?", (kanban_status, task_id))
        conn.commit()
        conn.close()
        return {"success": True, "task_id": task_id, "kanban_status": kanban_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新看板状态失败: {str(e)}")


@router.get("/tasks/card/{card_id}")
async def get_tasks_by_card(card_id: int):
    """获取卡片关联的任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.id, t.title, t.description, t.priority, t.due_date,
                   t.is_completed, t.completed_at, t.kanban_status,
                   t.created_at, t.updated_at, t.project_id,
                   t.assigned_to, t.assigned_to_name
            FROM gtd_tasks t
            JOIN card_task_relations ctr ON t.id = ctr.task_id
            WHERE ctr.card_id = ?
            ORDER BY t.is_completed, t.created_at DESC
        """, (card_id,))
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "priority": row["priority"],
                "due_date": row["due_date"],
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "completed_at": row["completed_at"],
                "kanban_status": row["kanban_status"] or "backlog",
                "created_at": row["created_at"],
                "project_id": row["project_id"],
                "assigned_to": row["assigned_to"],
                "assigned_to_name": row["assigned_to_name"]
            })
        conn.close()
        return {"card_id": card_id, "tasks": tasks, "total": len(tasks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取卡片任务失败: {str(e)}")


@router.get("/tasks/overdue")
async def get_overdue_tasks():
    """获取已逾期任务"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, description, category, priority, due_date,
                   remind_at, reminder_enabled, is_completed,
                   created_at, updated_at, remind_before_minutes, project_id,
                   recurrence, completed_at
            FROM gtd_tasks
            WHERE is_completed = 0
              AND due_date < ?
            ORDER BY due_date ASC,
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
        """, (today,))
        
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "priority": row["priority"],
                "due_date": row["due_date"],
                "remind_at": row["remind_at"],
                "reminder_enabled": bool(row["reminder_enabled"]) if row["reminder_enabled"] else False,
                "is_completed": bool(row["is_completed"]) if row["is_completed"] else False,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "remind_before_minutes": row["remind_before_minutes"],
                "recurrence": row["recurrence"] or "none",
                "completed_at": row["completed_at"],
                "project_id": row["project_id"]
            })
        
        conn.close()
        return {"tasks": tasks, "total": len(tasks)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取逾期任务失败: {str(e)}")


@router.put("/tasks/{task_id}/complete")
async def toggle_task_complete(task_id: int, is_completed: bool = True):
    """标记任务完成状态"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        completed_at = datetime.now().isoformat() if is_completed else None
        
        cursor.execute("""
            UPDATE gtd_tasks
            SET is_completed = ?, completed_at = ?, updated_at = datetime('now')
            WHERE id = ?
        """, (1 if is_completed else 0, completed_at, task_id))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "task_id": task_id, "is_completed": is_completed}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新任务状态失败: {str(e)}")


@router.post("/tasks/{task_id}/reminder")
async def set_task_reminder(task_id: int, remind_at: str, remind_before_minutes: int = 0):
    """设置任务提醒"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE gtd_tasks
            SET remind_at = ?, remind_before_minutes = ?, reminder_enabled = 1, 
                updated_at = datetime('now')
            WHERE id = ?
        """, (remind_at, remind_before_minutes, task_id))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "task_id": task_id, "remind_at": remind_at, "remind_before_minutes": remind_before_minutes}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置提醒失败: {str(e)}")


@router.get("/reminders/pending")
async def get_pending_reminders():
    """获取待提醒的任务（包括已到期未提醒的）"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 获取所有未完成且已启用的任务，提醒时间在未来或刚刚过期（5分钟内）
        cursor.execute("""
            SELECT id, title, description, remind_at, due_date, remind_before_minutes, project_id
            FROM gtd_tasks
            WHERE reminder_enabled = 1
              AND is_completed = 0
              AND (remind_at <= datetime('now', '+5 minutes') AND remind_at >= datetime('now', '-1 day'))
            ORDER BY remind_at ASC
            LIMIT 20
        """)
        
        reminders = []
        for row in cursor.fetchall():
            reminders.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "remind_at": row["remind_at"],
                "due_date": row["due_date"],
                "remind_before_minutes": row["remind_before_minutes"]
            })
        
        conn.close()
        return {"reminders": reminders, "total": len(reminders)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提醒失败: {str(e)}")
