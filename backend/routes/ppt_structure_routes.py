"""
PPT结构草稿 API 路由

基于MECE原则的PPT结构草稿生成接口

功能：
- 生成PPT结构草稿
- 获取草稿列表
- 导出草稿
- 获取MECE原则说明
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from skills.ppt_structure_draft_skill import (
    get_ppt_structure_draft_skill,
    PPTStructureDraftSkill
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ppt-structure", tags=["PPT结构草稿"])


class GenerateDraftRequest(BaseModel):
    """生成草稿请求"""
    topic: str = ""  # PPT主题
    content: str = ""  # 内容素材
    num_sections: int = 4  # 板块数量（3-5）


class SectionUpdateRequest(BaseModel):
    """更新板块请求"""
    draft_id: str
    section_id: str
    section_title: Optional[str] = None
    key_points: Optional[list] = None


# ==================== 主要接口 ====================

@router.post("/generate")
async def generate_ppt_draft(request: GenerateDraftRequest):
    """
    生成PPT结构草稿
    
    基于MECE原则，从杂乱的内容素材中梳理出清晰的PPT框架。
    
    请求参数：
    - topic: PPT主题
    - content: 内容素材（可以是文本摘要、数据要点、已有提纲等）
    - num_sections: 板块数量（3-5，默认4）
    
    返回：
    - draft: 草稿详情
    - sections: 板块列表
    - total_pages: 总页数
    - mece_compliant: 是否符合MECE原则
    """
    try:
        skill = get_ppt_structure_draft_skill()
        
        # 验证输入
        if not request.topic and not request.content:
            raise HTTPException(
                status_code=400,
                detail="请提供PPT主题或内容素材"
            )
        
        if not request.topic:
            request.topic = "未命名主题"
        
        if not request.content:
            request.content = "请提供内容素材以生成PPT结构"
        
        # 生成草稿
        result = await skill.execute(
            topic=request.topic,
            content=request.content,
            num_sections=request.num_sections
        )
        
        if result.get("status") != "success":
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "生成失败")
            )
        
        return {
            "status": "success",
            "message": "PPT结构草稿生成成功",
            "draft": result.get("draft"),
            "sections": result.get("sections"),
            "total_pages": result.get("total_pages"),
            "mece_compliant": result.get("mece_compliant"),
            "generated_at": result.get("generated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成PPT结构草稿失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drafts")
async def list_drafts():
    """
    获取草稿列表
    
    返回所有已生成的草稿统计信息
    """
    try:
        skill = get_ppt_structure_draft_skill()
        stats = skill.get_storage_stats()
        
        return {
            "status": "success",
            "total_drafts": stats.get("total_drafts", 0),
            "total_pages": stats.get("total_pages", 0),
            "latest_draft": stats.get("latest_draft")
        }
        
    except Exception as e:
        logger.error(f"获取草稿列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/draft/{draft_id}")
async def get_draft(draft_id: str):
    """
    获取指定草稿详情
    """
    try:
        skill = get_ppt_structure_draft_skill()
        draft = skill.export_draft(draft_id)
        
        if not draft:
            raise HTTPException(
                status_code=404,
                detail=f"草稿 {draft_id} 不存在"
            )
        
        return {
            "status": "success",
            "draft": draft
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取草稿详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/latest")
async def export_latest_draft():
    """
    导出最新草稿
    """
    try:
        skill = get_ppt_structure_draft_skill()
        draft = skill.export_draft()
        
        if not draft:
            raise HTTPException(
                status_code=404,
                detail="暂无草稿，请先生成"
            )
        
        return {
            "status": "success",
            "draft": draft
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出草稿失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/section")
async def update_section(request: SectionUpdateRequest):
    """
    更新板块信息
    
    允许用户调整板块标题和要点
    """
    try:
        skill = get_ppt_structure_draft_skill()
        
        # 查找草稿
        draft = skill.export_draft(request.draft_id)
        if not draft:
            raise HTTPException(
                status_code=404,
                detail=f"草稿 {request.draft_id} 不存在"
            )
        
        # 更新板块（这里简化处理，实际应用中可能需要更复杂的逻辑）
        sections = draft.get("sections", [])
        for section in sections:
            if section.get("section_id") == request.section_id:
                if request.section_title:
                    section["section_title"] = request.section_title
                if request.key_points:
                    section["key_points"] = request.key_points
                break
        
        return {
            "status": "success",
            "message": "板块更新成功",
            "draft": draft
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新板块失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear")
async def clear_drafts():
    """
    清空所有草稿
    """
    try:
        skill = get_ppt_structure_draft_skill()
        skill.clear_storage()
        
        return {
            "status": "success",
            "message": "已清空所有草稿"
        }
        
    except Exception as e:
        logger.error(f"清空草稿失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 辅助接口 ====================

@router.get("/mece-info")
async def get_mece_info():
    """
    获取MECE原则说明
    
    返回MECE原则的定义、作用和使用方法
    """
    return {
        "status": "success",
        "mece": {
            "name": "MECE原则",
            "full_name": "Mutually Exclusive, Collectively Exhaustive",
            "chinese": "相互独立，完全穷尽",
            "alias": "不重不漏原则",
            "origin": "麦肯锡顾问芭芭拉·明托提出",
            "purpose": "解决复杂问题时的分类和结构化表达难题",
            "definition": {
                "mutually_exclusive": {
                    "description": "每一部分不能重复交叉",
                    "meaning": "内容之间不重叠，每个板块独立存在"
                },
                "collectively_exhaustive": {
                    "description": "所有部分加起来要完整覆盖",
                    "meaning": "没有遗漏，所有重要内容都被包含"
                }
            },
            "application": {
                "scenarios": [
                    "PPT框架设计",
                    "手册撰写",
                    "报告编写",
                    "白皮书制作",
                    "企业内训资料大纲"
                ],
                "benefits": [
                    "结构明确：观众一眼就能看出你要讲几个部分",
                    "不重不漏：每一章节内容之间不重复、不啰唆",
                    "聚焦要点：每一页聚焦一个要点，便于讲解和记忆"
                ]
            },
            "usage": {
                "step1": "明确你要讲的主题或素材",
                "step2": "AI拆解结构，生成框架，排除重复",
                "step3": "你调整重点，补充内容",
                "step4": "AI再次帮你提炼要点，优化页面逻辑"
            }
        }
    }


@router.get("/prompt-template")
async def get_prompt_template():
    """
    获取提示词模板
    
    返回用于AI生成PPT结构的提示词模板
    """
    return {
        "status": "success",
        "template": {
            "description": "PPT结构草稿生成提示词模板",
            "template": """我已经整理出以下内容素材，请你以MECE原则为基础，帮助我：
1. 拆分出3~5个互不重叠、覆盖完整的内容板块；
2. 为每个板块起一个页面标题；
3. 为每个板块列出3条要点（每条不超过20字）；
4. 最终目标是生成一份适合制作PPT的结构草稿，便于我后续逐页填充内容。

素材如下：
{在这里粘贴或上传你的文本摘要、数据要点或已有提纲}""",
            "example": {
                "input": "公司年度总结：营收增长30%，用户突破1000万，新产品上线，获得融资",
                "output_structure": {
                    "sections": [
                        {
                            "title": "年度业绩概览",
                            "points": ["营收同比增长30%", "用户规模突破1000万", "市场占有率提升"]
                        },
                        {
                            "title": "产品发展成果",
                            "points": ["新产品成功上线", "功能满意度达90%", "迭代速度提升50%"]
                        },
                        {
                            "title": "融资与战略",
                            "points": ["完成B轮融资", "估值增长200%", "战略布局加速"]
                        },
                        {
                            "title": "未来规划",
                            "points": ["拓展海外市场", "技术研发投入", "团队扩张计划"]
                        }
                    ]
                }
            }
        }
    }