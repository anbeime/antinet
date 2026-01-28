"""
Mock API路由 - 为前端缺失的功能提供临时数据
"""
from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/mock", tags=["Mock数据"])

@router.get("/team/collaboration")
async def get_team_collaboration():
    """团队协作数据"""
    return {
        "status": "success",
        "data": {
            "members": [
                {
                    "id": "1",
                    "name": "张三",
                    "role": "管理员",
                    "avatar": "",
                    "status": "online",
                    "contributions": 45
                },
                {
                    "id": "2",
                    "name": "李四",
                    "role": "编辑",
                    "avatar": "",
                    "status": "offline",
                    "contributions": 32
                }
            ],
            "activities": [
                {
                    "id": "1",
                    "user": "张三",
                    "action": "创建了卡片",
                    "target": "系统架构设计",
                    "time": datetime.now().isoformat()
                }
            ],
            "stats": {
                "total_members": 2,
                "active_members": 1,
                "total_cards": 0,
                "total_activities": 1
            }
        }
    }

@router.get("/team/knowledge")
async def get_team_knowledge():
    """团队知识管理数据"""
    return {
        "status": "success",
        "data": {
            "spaces": [
                {
                    "id": "1",
                    "name": "技术文档",
                    "description": "团队技术文档库",
                    "card_count": 0,
                    "member_count": 2
                }
            ],
            "recent_updates": [],
            "stats": {
                "total_spaces": 1,
                "total_cards": 0,
                "total_members": 2
            }
        }
    }

@router.get("/analytics/report")
async def get_analytics_report():
    """分析报告数据"""
    return {
        "status": "success",
        "data": {
            "summary": {
                "total_cards": 0,
                "total_queries": 0,
                "avg_response_time": 0
            },
            "charts": [],
            "insights": [
                {
                    "type": "info",
                    "title": "系统正常运行",
                    "description": "所有服务运行正常"
                }
            ]
        }
    }

@router.get("/gtd/tasks")
async def get_gtd_tasks():
    """GTD任务数据"""
    return {
        "status": "success",
        "data": {
            "inbox": [],
            "today": [],
            "later": [],
            "archive": [],
            "projects": [],
            "stats": {
                "total": 0,
                "completed": 0,
                "pending": 0
            }
        }
    }

@router.get("/checklist/items")
async def get_checklist_items():
    """检查清单数据"""
    return {
        "status": "success",
        "data": {
            "categories": [
                {
                    "id": "1",
                    "name": "系统检查",
                    "items": [
                        {
                            "id": "1",
                            "title": "后端服务运行",
                            "checked": True,
                            "description": "检查后端服务是否正常运行"
                        },
                        {
                            "id": "2",
                            "title": "NPU模型加载",
                            "checked": False,
                            "description": "检查NPU模型是否成功加载"
                        },
                        {
                            "id": "3",
                            "title": "数据库连接",
                            "checked": True,
                            "description": "检查数据库连接是否正常"
                        }
                    ]
                }
            ],
            "stats": {
                "total": 3,
                "completed": 2,
                "pending": 1
            }
        }
    }
