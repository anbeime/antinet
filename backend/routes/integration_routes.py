"""
任务-笔记双向链接与日历整合 API 路由
实现：
1. 从知识卡片创建GTD任务，建立双向链接
2. 查询卡片关联任务、任务关联卡片
3. 日历事件CRUD，支持从笔记创建日程，支持拖拽创建
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
from pathlib import Path

from paths import DB_PATH

router = APIRouter(prefix="/api/integration", tags=["整合功能 - 任务-笔记双向链接与日历"])


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


# ========== 双向链接 - 任务创建 ==========

class CreateTaskFromCardRequest(BaseModel):
    """从卡片创建任务请求"""
    card_id: int
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "high"
    category: Optional[str] = "inbox"
    due_date: Optional[str] = None
    extract_paragraph: Optional[str] = None


class CardTaskRelation(BaseModel):
    """卡片任务关联"""
    id: int
    card_id: int
    task_id: int
    relation_type: str
    extract_paragraph: Optional[str] = None
    created_at: str


class TaskWithRelation(BaseModel):
    """带关联信息的任务"""
    id: int
    title: str
    description: Optional[str]
    category: str
    priority: Optional[str]
    due_date: Optional[str]
    created_at: str
    updated_at: str
    is_completed: bool
    relation_type: str
    extract_paragraph: Optional[str]


class CardWithRelation(BaseModel):
    """带关联信息的卡片"""
    id: int
    title: str
    content: str
    card_type: Optional[str]
    type: Optional[str]
    created_at: str
    updated_at: str
    relation_type: str
    extract_paragraph: Optional[str]


@router.post("/card/create-task", summary="从知识卡片创建GTD任务（建立双向链接）")
async def create_task_from_card(req: CreateTaskFromCardRequest):
    """从知识卡片的段落创建GTD任务，并自动建立双向链接"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查卡片是否存在并获取其专题信息
        cursor.execute("SELECT id, project_id FROM knowledge_cards WHERE id = ?", (req.card_id,))
        card_row = cursor.fetchone()
        if not card_row:
            conn.close()
            raise HTTPException(status_code=404, detail="知识卡片不存在")
        
        card_project_id = card_row.get("project_id") if hasattr(card_row, "get") else card_row[1]
        
        # 如果卡片属于某个专题，自动关联到该专题
        if card_project_id:
            source_type = 'project'
            source_id = card_project_id
            category = req.category or 'projects'
            project_id = card_project_id
        else:
            source_type = 'card'
            source_id = req.card_id
            category = req.category or 'inbox'
            project_id = None
        
        cursor.execute("""
            INSERT INTO gtd_tasks (title, description, priority, category, due_date, source_type, source_id, project_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (req.title, req.description, req.priority, category, req.due_date, source_type, source_id, project_id))
        task_id = cursor.lastrowid
        
        # 创建关联关系
        if req.extract_paragraph:
            cursor.execute("""
                INSERT OR IGNORE INTO card_task_relations (card_id, task_id, relation_type, extract_paragraph)
                VALUES (?, ?, 'extracted_from', ?)
            """, (req.card_id, task_id, req.extract_paragraph))
        else:
            cursor.execute("""
                INSERT OR IGNORE INTO card_task_relations (card_id, task_id, relation_type)
                VALUES (?, ?, 'extracted_from')
            """, (req.card_id, task_id))
        
        conn.commit()
        
        # 获取创建的任务
        cursor.execute("SELECT * FROM gtd_tasks WHERE id = ?", (task_id,))
        task = dict(cursor.fetchone())
        conn.close()
        
        return {
            "success": True,
            "task": task,
            "card_id": req.card_id,
            "relation_created": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建任务失败: {str(e)}")


@router.get("/card/{card_id}/tasks", summary="获取知识卡片关联的所有任务", response_model=List[TaskWithRelation])
async def get_tasks_for_card(card_id: int):
    """获取知识卡片关联的所有GTD任务"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT t.*, r.relation_type, r.extract_paragraph
            FROM gtd_tasks t
            JOIN card_task_relations r ON t.id = r.task_id
            WHERE r.card_id = ?
            ORDER BY t.created_at DESC
        """, (card_id,))
        
        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            row_dict['is_completed'] = bool(row_dict.get('is_completed', 0)) if row_dict.get('is_completed') is not None else False
            row_dict['reminder_enabled'] = bool(row_dict.get('reminder_enabled', 0)) if row_dict.get('reminder_enabled') is not None else False
            results.append(row_dict)
        
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务失败: {str(e)}")


@router.get("/task/{task_id}/cards", summary="获取任务关联的所有知识卡片", response_model=List[CardWithRelation])
async def get_cards_for_task(task_id: int):
    """获取任务关联的所有知识卡片"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT k.*, r.relation_type, r.extract_paragraph
            FROM knowledge_cards k
            JOIN card_task_relations r ON k.id = r.card_id
            WHERE r.task_id = ?
            ORDER BY k.created_at DESC
        """, (task_id,))
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取卡片失败: {str(e)}")


@router.delete("/card/{card_id}/task/{task_id}", summary="移除卡片和任务的关联")
async def remove_card_task_relation(card_id: int, task_id: int):
    """移除卡片和任务的关联关系"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            DELETE FROM card_task_relations WHERE card_id = ? AND task_id = ?
        """, (card_id, task_id))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        
        return {"success": True, "deleted": deleted}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除关联失败: {str(e)}")


# ========== 日历事件 ==========

class CalendarEventCreate(BaseModel):
    """创建日历事件请求"""
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    is_all_day: bool = False
    location: Optional[str] = None
    category: str = "default"
    color: Optional[str] = None
    source_card_id: Optional[int] = None
    source_paragraph: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    """更新日历事件请求"""
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_all_day: Optional[bool] = None
    location: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    is_completed: Optional[bool] = None


class CalendarEvent(BaseModel):
    """日历事件响应"""
    id: int
    title: str
    description: Optional[str]
    start_time: str
    end_time: str
    is_all_day: bool
    location: Optional[str]
    category: str
    color: Optional[str]
    source_card_id: Optional[int]
    source_paragraph: Optional[str]
    created_at: str
    updated_at: str
    is_completed: bool


@router.post("/calendar/events", summary="创建日历事件", response_model=CalendarEvent)
async def create_calendar_event(req: CalendarEventCreate):
    """创建日历事件，支持从笔记段落拖拽创建"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO calendar_events (
                title, description, start_time, end_time, is_all_day,
                location, category, color, source_card_id, source_paragraph
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req.title, req.description, req.start_time, req.end_time,
            1 if req.is_all_day else 0, req.location, req.category,
            req.color, req.source_card_id, req.source_paragraph
        ))
        event_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,))
        event = dict(cursor.fetchone())
        event['is_all_day'] = bool(event['is_all_day'])
        event['is_completed'] = bool(event['is_completed'])
        conn.close()
        
        return event
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建日历事件失败: {str(e)}")


@router.get("/calendar/events", summary="获取日期范围内的日历事件", response_model=List[CalendarEvent])
async def get_calendar_events(start_date: str, end_date: str):
    """获取指定日期范围内的日历事件"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 查询覆盖该时间段的所有事件
        cursor.execute("""
            SELECT * FROM calendar_events
            WHERE (start_time BETWEEN ? AND ? OR end_time BETWEEN ? AND ?)
               OR (start_time <= ? AND end_time >= ?)
            ORDER BY start_time ASC
        """, (start_date, end_date, start_date, end_date, start_date, end_date))
        
        results = []
        for row in cursor.fetchall():
            event = dict(row)
            event['is_all_day'] = bool(event['is_all_day'])
            event['is_completed'] = bool(event['is_completed'])
            results.append(event)
        
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日历事件失败: {str(e)}")


@router.get("/calendar/events/all", summary="获取所有日历事件", response_model=List[CalendarEvent])
async def get_all_calendar_events():
    """获取所有日历事件"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM calendar_events
            ORDER BY start_time ASC
        """)
        results = []
        for row in cursor.fetchall():
            event = dict(row)
            event['is_all_day'] = bool(event['is_all_day'])
            event['is_completed'] = bool(event['is_completed'])
            results.append(event)
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日历事件失败: {str(e)}")


@router.get("/calendar/events/{event_id}", summary="获取单个日历事件", response_model=CalendarEvent)
async def get_calendar_event(event_id: int):
    """获取单个日历事件详情"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="日历事件不存在")
        
        event = dict(row)
        event['is_all_day'] = bool(event['is_all_day'])
        event['is_completed'] = bool(event['is_completed'])
        return event
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日历事件失败: {str(e)}")


@router.put("/calendar/events/{event_id}", summary="更新日历事件", response_model=CalendarEvent)
async def update_calendar_event(event_id: int, req: CalendarEventUpdate):
    """更新日历事件"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查是否存在
        cursor.execute("SELECT id FROM calendar_events WHERE id = ?", (event_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="日历事件不存在")
        
        # 构建更新语句
        updates = []
        values = []
        if req.title is not None:
            updates.append("title = ?")
            values.append(req.title)
        if req.description is not None:
            updates.append("description = ?")
            values.append(req.description)
        if req.start_time is not None:
            updates.append("start_time = ?")
            values.append(req.start_time)
        if req.end_time is not None:
            updates.append("end_time = ?")
            values.append(req.end_time)
        if req.is_all_day is not None:
            updates.append("is_all_day = ?")
            values.append(1 if req.is_all_day else 0)
        if req.location is not None:
            updates.append("location = ?")
            values.append(req.location)
        if req.category is not None:
            updates.append("category = ?")
            values.append(req.category)
        if req.color is not None:
            updates.append("color = ?")
            values.append(req.color)
        if req.is_completed is not None:
            updates.append("is_completed = ?")
            values.append(1 if req.is_completed else 0)
        
        updates.append("updated_at = datetime('now')")
        values.append(event_id)
        
        if updates:
            sql = f"UPDATE calendar_events SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, values)
            conn.commit()
        
        cursor.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,))
        event = dict(cursor.fetchone())
        event['is_all_day'] = bool(event['is_all_day'])
        event['is_completed'] = bool(event['is_completed'])
        conn.close()
        
        return event
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新日历事件失败: {str(e)}")


@router.delete("/calendar/events/{event_id}", summary="删除日历事件")
async def delete_calendar_event(event_id: int):
    """删除日历事件"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        if not deleted:
            raise HTTPException(status_code=404, detail="日历事件不存在")
        
        return {"success": True, "deleted": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除日历事件失败: {str(e)}")


@router.get("/calendar/card/{card_id}/events", summary="获取知识卡片关联的日历事件", response_model=List[CalendarEvent])
async def get_events_for_card(card_id: int):
    """获取知识卡片关联的所有日历事件"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM calendar_events
            WHERE source_card_id = ?
            ORDER BY start_time ASC
        """, (card_id,))
        
        results = []
        for row in cursor.fetchall():
            event = dict(row)
            event['is_all_day'] = bool(event['is_all_day'])
            event['is_completed'] = bool(event['is_completed'])
            results.append(event)
        
        conn.close()
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日历事件失败: {str(e)}")


@router.get("/health", summary="健康检查")
async def integration_health():
    """整合功能健康检查"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        # 检查表是否存在
        cursor.execute("SELECT COUNT(*) FROM card_task_relations")
        relation_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM calendar_events")
        event_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "integrations": {
                "card_task_relations": "ready",
                "calendar_events": "ready"
            },
            "counts": {
                "relations": relation_count,
                "events": event_count
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
