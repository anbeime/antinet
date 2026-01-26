"""
技能系统路由
提供技能管理和调用的 API
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

from services.skill_system import get_skill_registry, Skill

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/skill", tags=["技能系统"])

# 获取技能注册表
skill_registry = get_skill_registry()


# ==================== API 模型 ====================

class SkillInfo(BaseModel):
    """技能信息"""
    name: str
    description: str
    category: str
    agent_name: str
    enabled: bool
    last_used: Optional[str] = None
    usage_count: int = 0


class SkillExecutionRequest(BaseModel):
    """技能执行请求"""
    skill_name: str = Field(..., description="技能名称")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="技能参数")


class SkillExecutionResponse(BaseModel):
    """技能执行响应"""
    skill: str
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    usage_count: int
    last_used: str


# ==================== 端点 ====================

@router.get("/list")
async def list_skills(agent_name: Optional[str] = None, category: Optional[str] = None):
    """
    列出所有可用技能
    
    参数：
        agent_name: 按 Agent 名称过滤（可选）
        category: 按类别过滤（可选）
    """
    try:
        skills = skill_registry.list_skills(agent_name=agent_name, category=category)
        
        return {
            "total": len(skills),
            "skills": skills
        }
    except Exception as e:
        logger.error(f"列出技能失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_skill_categories():
    """获取所有技能类别"""
    try:
        categories = skill_registry.skill_categories
        
        # 添加每个类别的技能数量
        category_info = []
        for category, agents in categories.items():
            skills = skill_registry.get_skills_by_category(category)
            category_info.append({
                "category": category,
                "agents": agents,
                "skill_count": len(skills)
            })
        
        return {
            "categories": category_info,
            "total_categories": len(categories)
        }
    except Exception as e:
        logger.error(f"获取技能类别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skill/{skill_name}")
async def get_skill_info(skill_name: str):
    """获取指定技能的详细信息"""
    try:
        skill = skill_registry.get_skill(skill_name)
        
        if skill is None:
            raise HTTPException(status_code=404, detail=f"技能不存在: {skill_name}")
        
        return skill.get_info()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取技能信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute", response_model=SkillExecutionResponse)
async def execute_skill(request: SkillExecutionRequest):
    """
    执行指定技能
    
    参数：
        skill_name: 技能名称
        parameters: 技能参数
    """
    try:
        # 获取技能
        skill = skill_registry.get_skill(request.skill_name)
        
        if skill is None:
            raise HTTPException(status_code=404, detail=f"技能不存在: {request.skill_name}")
        
        # 检查技能是否启用
        if not skill.enabled:
            raise HTTPException(status_code=400, detail=f"技能已禁用: {request.skill_name}")
        
        # 执行技能
        result = await skill_registry.execute_skill(
            request.skill_name,
            **request.parameters
        )
        
        return SkillExecutionResponse(
            skill=request.skill_name,
            success=True,
            result=result.get("result"),
            usage_count=result.get("usage_count", 0),
            last_used=result.get("last_used", datetime.now().isoformat())
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行技能失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent/{agent_name}")
async def get_agent_skills(agent_name: str):
    """获取指定 Agent 的所有技能"""
    try:
        skills = skill_registry.get_skills_by_agent(agent_name)
        
        return {
            "agent_name": agent_name,
            "skill_count": len(skills),
            "skills": [skill.get_info() for skill in skills]
        }
    except Exception as e:
        logger.error(f"获取 Agent 技能失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-execute")
async def batch_execute_skills(requests: List[SkillExecutionRequest]):
    """
    批量执行技能
    
    参数：
        requests: 技能执行请求列表
    """
    try:
        results = []
        
        for req in requests:
            try:
                result = await skill_registry.execute_skill(
                    req.skill_name,
                    **req.parameters
                )
                results.append({
                    "skill": req.skill_name,
                    "success": True,
                    "result": result
                })
            except Exception as e:
                results.append({
                    "skill": req.skill_name,
                    "success": False,
                    "error": str(e)
                })
        
        successful = sum(1 for r in results if r["success"])
        
        return {
            "total_requests": len(requests),
            "successful": successful,
            "failed": len(requests) - successful,
            "results": results
        }
    except Exception as e:
        logger.error(f"批量执行技能失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_skill_statistics():
    """获取技能统计信息"""
    try:
        all_skills = skill_registry.list_skills()
        
        # 统计
        total_skills = len(all_skills)
        enabled_skills = sum(1 for s in all_skills if s["enabled"])
        total_usage = sum(s["usage_count"] for s in all_skills)
        
        # 按 Agent 分组
        skills_by_agent = {}
        for skill_info in all_skills:
            agent = skill_info["agent_name"]
            if agent not in skills_by_agent:
                skills_by_agent[agent] = {
                    "total": 0,
                    "enabled": 0,
                    "usage_count": 0
                }
            skills_by_agent[agent]["total"] += 1
            if skill_info["enabled"]:
                skills_by_agent[agent]["enabled"] += 1
            skills_by_agent[agent]["usage_count"] += skill_info["usage_count"]
        
        # 按类别分组
        skills_by_category = {}
        for skill_info in all_skills:
            category = skill_info["category"]
            if category not in skills_by_category:
                skills_by_category[category] = {
                    "total": 0,
                    "enabled": 0,
                    "usage_count": 0
                }
            skills_by_category[category]["total"] += 1
            if skill_info["enabled"]:
                skills_by_category[category]["enabled"] += 1
            skills_by_category[category]["usage_count"] += skill_info["usage_count"]
        
        return {
            "total_skills": total_skills,
            "enabled_skills": enabled_skills,
            "total_usage": total_usage,
            "skills_by_agent": skills_by_agent,
            "skills_by_category": skills_by_category
        }
    except Exception as e:
        logger.error(f"获取技能统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
