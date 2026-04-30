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
@router.get("/available")
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


@router.post("/html-report")
async def generate_html_report(
    data: List[Dict[str, Any]],
    title: str = "数据分析报告",
    chart_type: str = "auto",
    include_table: bool = True
):
    """
    生成 HTML 报告（使用 Chart.js）
    
    参数：
        data: 数据列表
        title: 报告标题
        chart_type: 图表类型 (line/bar/pie/doughnut/mixed/auto)
        include_table: 是否包含数据表格
    
    返回：
        HTML 报告内容
    """
    try:
        from skills.html_report_skill import HtmlReportSkill
        
        skill = HtmlReportSkill()
        result = await skill.execute(
            data=data,
            title=title,
            chart_type=chart_type,
            include_table=include_table
        )
        
        if result.get("status") == "success":
            return {
                "status": "success",
                "html": result.get("html"),
                "charts": result.get("charts", []),
                "summary": result.get("summary", {})
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "生成失败"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成HTML报告失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-report")
async def generate_full_report(
    data: List[Dict[str, Any]],
    title: str = "数据分析报告",
    config: Optional[Dict[str, Any]] = None
):
    """
    生成完整报表（Excel + PDF + PPT）
    
    参数：
        data: 数据列表
        title: 报告标题
        config: 配置选项
    
    返回：
        {
            "status": "success",
            "excel": "path/to/report.xlsx",
            "pdf": "path/to/report.pdf",
            "ppt": "path/to/report.pptx"
        }
    """
    try:
        from skills.report_automation_skill import ReportAutomationSkill
        
        skill = ReportAutomationSkill()
        result = await skill.execute(data=data, title=title, config=config)
        
        if result.get("status") == "success":
            return {
                "status": "success",
                "excel": result.get("excel"),
                "pdf": result.get("pdf"),
                "ppt": result.get("ppt"),
                "timestamp": result.get("timestamp")
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "生成失败"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成完整报表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-report-from-file")
async def generate_full_report_from_file(
    data_source: str,
    query: str = "",
    output_path: str = "./report_output",
    output_format: str = "all"
):
    """
    从数据源文件生成完整报表（使用 8-Agent 分析）
    
    参数：
        data_source: 数据源路径（.csv, .xlsx, .xls）
        query: 分析需求描述
        output_path: 输出路径前缀
        output_format: 输出格式 ("excel", "pdf", "ppt", "all")
    
    返回：
        {
            "status": "success",
            "output_paths": {"excel": "...", "html": "..."},
            "cards_count": 10,
            "data_rows": 1000
        }
    """
    try:
        from skills.report_automation_skill import ReportAutomationSkill
        
        skill = ReportAutomationSkill()
        result = await skill.execute_from_file(
            data_source=data_source,
            query=query,
            output_path=output_path,
            output_format=output_format
        )
        
        if result.get("status") == "success":
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "生成失败"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"从数据源生成报表失败: {e}")
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
        
        # 基础统计
        total_skills = len(all_skills)
        enabled_skills = sum(1 for s in all_skills if s["enabled"])
        total_usage = sum(s["usage_count"] for s in all_skills)
        
        # 任务执行统计（真实数据）
        task_stats = skill_registry.task_stats
        total_executions = task_stats["total_executions"]
        successful = task_stats["successful_executions"]
        failed = task_stats["failed_executions"]
        task_completion_rate = (successful / total_executions * 100) if total_executions > 0 else 0
        
        # 计算平均响应时间
        response_times = task_stats["response_times"]
        avg_response_time = (sum(response_times) / len(response_times)) if response_times else 0
        
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
            "skills_by_category": skills_by_category,
            # 真实任务执行统计
            "task_stats": {
                "total_executions": total_executions,
                "successful_executions": successful,
                "failed_executions": failed,
                "task_completion_rate": round(task_completion_rate, 1),
                "avg_response_time": round(avg_response_time, 3),
                "active_tasks": task_stats["active_tasks"],
                "today_processed": total_executions  # 今日处理 = 总执行次数
            }
        }
    except Exception as e:
        logger.error(f"获取技能统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 四色卡片知识库 API ====================

@router.post("/four-color-cards/extract")
async def extract_four_color_cards(
    text: str,
    source: str = "",
    build_relations: bool = True
):
    """
    从文本中提取四色卡片
    
    参数：
        text: 待处理的文本内容
        source: 信息来源
        build_relations: 是否构建关联关系
    """
    try:
        from skills.four_color_card_skill import get_four_color_card_skill
        
        skill = get_four_color_card_skill()
        result = await skill.execute(
            text=text,
            source=source,
            build_relations=build_relations
        )
        
        return result
    except Exception as e:
        logger.error(f"四色卡片提取失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/four-color-cards/stats")
async def get_four_color_cards_stats():
    """获取四色卡片存储统计"""
    try:
        from skills.four_color_card_skill import get_four_color_card_skill
        
        skill = get_four_color_card_skill()
        return skill.get_storage_stats()
    except Exception as e:
        logger.error(f"获取四色卡片统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/four-color-cards/export")
async def export_four_color_cards(card_type: Optional[str] = None):
    """
    导出四色卡片
    
    参数：
        card_type: 过滤卡片类型 (blue/green/yellow/red)
    """
    try:
        from skills.four_color_card_skill import get_four_color_card_skill
        
        skill = get_four_color_card_skill()
        cards = skill.export_cards(card_type)
        
        return {
            "total": len(cards),
            "cards": cards
        }
    except Exception as e:
        logger.error(f"导出四色卡片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/four-color-cards/system-prompt")
async def get_four_color_cards_system_prompt():
    """获取四色卡片系统的提示词（供Hermes使用）"""
    try:
        from skills.four_color_card_skill import get_four_color_card_skill
        
        skill = get_four_color_card_skill()
        return {
            "system_prompt": skill.get_system_prompt()
        }
    except Exception as e:
        logger.error(f"获取四色卡片提示词失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/four-color-cards/clear")
async def clear_four_color_cards():
    """清空四色卡片存储"""
    try:
        from skills.four_color_card_skill import get_four_color_card_skill
        
        skill = get_four_color_card_skill()
        skill.clear_storage()
        
        return {"status": "success", "message": "四色卡片存储已清空"}
    except Exception as e:
        logger.error(f"清空四色卡片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
