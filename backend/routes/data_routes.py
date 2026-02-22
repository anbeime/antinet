# backend/routes/data_routes.py - 数据管理API
"""
提供团队成员、知识空间、协作活动等数据的CRUD接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["数据管理"])

# ========== 数据模型 ==========
class TeamMember(BaseModel):
    id: Optional[int] = None
    name: str
    role: str
    avatar: str = "👤"
    online: bool = True
    join_date: Optional[str] = None
    last_active: Optional[str] = None
    permissions: Optional[List[str]] = ["read", "write"]
    contribution: int = 0
    email: Optional[str] = None


class KnowledgeSpace(BaseModel):
    id: Optional[int] = None
    name: str
    description: str
    members: Optional[List[str]] = []
    owner: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    card_count: int = 0
    is_public: bool = True


class Activity(BaseModel):
    id: Optional[int] = None
    user_name: str
    action: str
    content: str
    timestamp: Optional[str] = None
    space_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = {}


class Comment(BaseModel):
    id: Optional[int] = None
    user_name: str
    user_avatar: str = "👤"
    content: str
    created_at: Optional[str] = None
    target_id: int
    target_type: str = "space"
    parent_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = {}


class ChecklistData(BaseModel):
    id: Optional[int] = None
    data_json: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GtdTask(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    category: str = "inbox"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ========== 全局数据库管理器（在main.py中初始化） ==========
_db_manager = None


def set_db_manager(db_manager):
    """设置数据库管理器"""
    global _db_manager
    _db_manager = db_manager


def get_db_manager():
    """获取数据库管理器"""
    if _db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    return _db_manager


# ========== 团队成员API ==========
@router.get("/team-members", response_model=List[TeamMember])
async def get_team_members():
    """获取所有团队成员"""
    try:
        db = get_db_manager()
        members = db.get_all_team_members()
        
        # 处理 permissions 字段，将 JSON 字符串解析为列表
        for member in members:
            if isinstance(member, dict):
                if 'permissions' in member and isinstance(member['permissions'], str):
                    try:
                        member['permissions'] = json.loads(member['permissions'])
                    except json.JSONDecodeError:
                        member['permissions'] = ["read", "write"]
        
        return members
    except Exception as e:
        logger.error(f"获取团队成员失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team-members", response_model=TeamMember)
async def add_team_member(member: TeamMember):
    """添加团队成员"""
    try:
        db = get_db_manager()
        new_member = db.add_team_member(
            name=member.name,
            role=member.role,
            avatar=member.avatar,
            email=member.email,
            contribution=member.contribution
        )
        return new_member
    except Exception as e:
        logger.error(f"添加团队成员失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/team-members/{member_id}")
async def update_team_member(member_id: int, member: TeamMember):
    """更新团队成员信息"""
    try:
        db = get_db_manager()
        success = db.update_team_member(
            member_id,
            name=member.name,
            role=member.role,
            avatar=member.avatar,
            contribution=member.contribution,
            email=member.email
        )
        if not success:
            raise HTTPException(status_code=404, detail="成员不存在")
        return {"success": True, "message": "更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新团队成员失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/team-members/{member_id}")
async def delete_team_member(member_id: int):
    """删除团队成员"""
    try:
        db = get_db_manager()
        success = db.delete_team_member(member_id)
        if not success:
            raise HTTPException(status_code=404, detail="成员不存在")
        return {"success": True, "message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除团队成员失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 知识空间API ==========
@router.get("/knowledge-spaces", response_model=List[KnowledgeSpace])
async def get_knowledge_spaces():
    """获取所有知识空间"""
    try:
        db = get_db_manager()
        spaces = db.get_all_knowledge_spaces()
        return spaces
    except Exception as e:
        logger.error(f"获取知识空间失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/knowledge-spaces", response_model=KnowledgeSpace)
async def add_knowledge_space(space: KnowledgeSpace):
    """添加知识空间"""
    try:
        db = get_db_manager()
        new_space = db.add_knowledge_space(
            name=space.name,
            description=space.description,
            owner=space.owner,
            members=space.members,
            is_public=space.is_public
        )
        return new_space
    except Exception as e:
        logger.error(f"添加知识空间失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 协作活动API ==========
@router.get("/activities")
async def get_activities(limit: int = 20):
    """获取最近的协作活动"""
    try:
        db = get_db_manager()
        activities = db.get_recent_activities(limit)
        # 转换为字典列表，确保可以序列化
        result = []
        for activity in activities:
            if isinstance(activity, dict):
                result.append(activity)
            else:
                # 如果是 Row 对象，转换为字典
                result.append(dict(activity))
        return result
    except Exception as e:
        logger.error(f"获取协作活动失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/activities", response_model=Activity)
async def add_activity(activity: Activity):
    """添加协作活动"""
    try:
        db = get_db_manager()
        new_activity = db.add_activity(
            user_name=activity.user_name,
            action=activity.action,
            content=activity.content,
            space_id=activity.space_id,
            metadata=activity.metadata
        )
        return new_activity
    except Exception as e:
        logger.error(f"添加协作活动失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 评论API ==========
@router.get("/comments/{target_id}")
async def get_comments(target_id: int, target_type: str = "space"):
    """获取评论"""
    try:
        db = get_db_manager()
        comments = db.get_comments(target_id, target_type)
        return comments
    except Exception as e:
        logger.error(f"获取评论失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments", response_model=Comment)
async def add_comment(comment: Comment):
    """添加评论"""
    try:
        db = get_db_manager()
        new_comment = db.add_comment(
            user_name=comment.user_name,
            user_avatar=comment.user_avatar,
            content=comment.content,
            target_id=comment.target_id,
            target_type=comment.target_type,
            parent_id=comment.parent_id
        )
        return new_comment
    except Exception as e:
        logger.error(f"添加评论失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 分析数据API ==========
@router.get("/analytics/{category}")
async def get_analytics_data(category: str):
    """获取分析数据"""
    try:
        db = get_db_manager()
        data = db.get_analytics_data(category)
        if not data:
            return {"category": category, "data": []}
        return data
    except Exception as e:
        logger.error(f"获取分析数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/analytics/{category}")
async def update_analytics_data(category: str, data: Dict[str, Any]):
    """更新分析数据"""
    try:
        db = get_db_manager()
        updated = db.update_analytics_data(category, data)
        return updated
    except Exception as e:
        logger.error(f"更新分析数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 检查清单API ==========
@router.get("/checklist")
async def get_checklist_data():
    """获取检查清单数据"""
    try:
        db = get_db_manager()
        data = db.get_checklist_data()
        if not data:
            return {"data": []}
        return data
    except Exception as e:
        logger.error(f"获取检查清单失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/checklist")
async def update_checklist_data(data_json: str):
    """更新检查清单数据"""
    try:
        db = get_db_manager()
        updated = db.update_checklist_data(data_json)
        return updated
    except Exception as e:
        logger.error(f"更新检查清单失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== GTD任务API ==========
@router.get("/gtd-tasks")
async def get_gtd_tasks(category: Optional[str] = None):
    """获取GTD任务"""
    try:
        db = get_db_manager()
        tasks = db.get_gtd_tasks(category)
        return tasks
    except Exception as e:
        logger.error(f"获取GTD任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gtd-tasks", response_model=GtdTask)
async def add_gtd_task(task: GtdTask):
    """添加GTD任务"""
    try:
        db = get_db_manager()
        new_task = db.add_gtd_task(
            title=task.title,
            description=task.description,
            priority=task.priority,
            category=task.category,
            due_date=task.due_date
        )
        return new_task
    except Exception as e:
        logger.error(f"添加GTD任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/gtd-tasks/{task_id}")
async def update_gtd_task(task_id: int, task: Dict[str, Any]):
    """更新GTD任务"""
    try:
        db = get_db_manager()
        updated = db.update_gtd_task(task_id, **task)
        return {"success": updated}
    except Exception as e:
        logger.error(f"更新GTD任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/gtd-tasks/{task_id}")
async def delete_gtd_task(task_id: int):
    """删除GTD任务"""
    try:
        db = get_db_manager()
        deleted = db.delete_gtd_task(task_id)
        return {"success": deleted}
    except Exception as e:
        logger.error(f"删除GTD任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gtd-tasks/sync-card/{card_id}")
async def sync_card_to_gtd(card_id: int):
    """将单个卡片同步到GTD任务"""
    try:
        db = get_db_manager()
        result = db.sync_card_to_gtd(card_id)
        if result is None:
            raise HTTPException(status_code=404, detail="卡片不存在或不是风险/行动卡片")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"同步卡片到GTD失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gtd-tasks/sync-all-cards")
async def sync_all_cards_to_gtd():
    """同步所有风险/行动卡片到GTD"""
    try:
        db = get_db_manager()
        result = db.sync_all_cards_to_gtd()
        return {
            "success": True,
            "message": f"已同步 {result['synced']} 张卡片，跳过 {result['skipped']} 张已存在的卡片",
            **result
        }
    except Exception as e:
        logger.error(f"批量同步卡片到GTD失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
