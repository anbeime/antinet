#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工作流编排引擎 - 对话驱动工作流系统核心
支持动态工作流生成、预置模板库（20+场景）、条件分支、跨模块数据桥接
"""
import logging
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum

from routes.intent_recognition import IntentType, IntentResult, get_intent_emoji

# 模块→技能名映射（将工作流模块路由到 Hermes SkillRegistry 技能）
MODULE_SKILL_MAP = {
    "knowledge_graph": "knowledge_graph_visualization",
    "card_filter": "card_filter",
    "four_color_card": "four_color_card",
    "html_report": "html_report",
    "report_automation": "report_automation",
    "markdown_convert": "markdown_formatter",
    "book_skill": "book_skill",
    "data_analysis": "data_analysis_exporter",
}

def _get_skill_registry():
    """惰性获取 Hermes SkillRegistry 实例"""
    try:
        from services.skill_system import get_skill_registry as _gsr
        return _gsr()
    except ImportError:
        return None

logger = logging.getLogger(__name__)


# ============ 数据模型 ============

class WorkflowStatus(str, Enum):
    """工作流状态"""
    PENDING = "pending"        # 等待执行
    RUNNING = "running"        # 执行中
    PAUSED = "paused"          # 已暂停
    WAITING_INPUT = "waiting_input"  # 等待用户输入
    COMPLETED = "completed"    # 已完成
    FAILED = "failed"          # 执行失败
    CANCELLED = "cancelled"    # 已取消


@dataclass
class WorkflowStep:
    """工作流步骤"""
    step_id: str
    name: str
    description: str
    intent_type: str                        # 关联的意图类型
    module: str                             # 调用的功能模块
    action: str                             # 具体操作
    params: Dict[str, Any] = field(default_factory=dict)
    conditions: List[Dict[str, Any]] = field(default_factory=list)  # 条件分支
    next_step_id: Optional[str] = None      # 默认下一步
    timeout_seconds: int = 60
    can_skip: bool = True
    requires_input: bool = False
    input_prompt: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class WorkflowTemplate:
    """工作流模板"""
    template_id: str
    name: str
    description: str
    category: str                           # 分类：学术研究/项目管理/市场分析等
    primary_intent: IntentType
    steps: List[WorkflowStep]
    estimated_steps: int
    estimated_time_minutes: int
    tags: List[str] = field(default_factory=list)
    icon: str = "📋"


@dataclass
class WorkflowExecution:
    """工作流执行实例"""
    execution_id: str
    template_id: str
    user_query: str
    user_id: str
    intent_result: IntentResult
    steps: List[WorkflowStep]
    current_step_index: int = 0
    status: WorkflowStatus = WorkflowStatus.PENDING
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    execution_log: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)


# ============ 预置工作流模板库（20+场景）============

PREDEFINED_WORKFLOWS: Dict[str, WorkflowTemplate] = {}


def _init_workflow_templates():
    """初始化所有预置工作流模板"""
    global PREDEFINED_WORKFLOWS
    
    # 1. 文献综述工作流
    PREDEFINED_WORKFLOWS["literature_review"] = WorkflowTemplate(
        template_id="literature_review",
        name="文献综述",
        description="系统性地搜索、整理和分析特定领域的研究资料，生成结构化的文献综述报告",
        category="学术研究",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=6,
        estimated_time_minutes=15,
        tags=["学术", "研究", "综述", "文献"],
        icon="📚",
        steps=[
            WorkflowStep("s1", "确定研究主题", "明确文献综述的主题和范围", "complex_workflow", "clarification", "ask_question",
                params={"question": "请明确文献综述的主题和范围（如领域、时间跨度等）"},
                requires_input=True, input_prompt="请输入研究主题和范围"),
            WorkflowStep("s2", "搜索相关知识", "在知识库中搜索相关卡片和资料", "search_cards", "knowledge_search", "search_cards_hybrid",
                params={"limit": 20}),
            WorkflowStep("s3", "分析文档", "如需要，分析上传的PDF/Word研究文档", "analyze_document", "document_analysis", "analyze_document"),
            WorkflowStep("s4", "生成四色卡片", "从研究资料中提取四色知识卡片", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s5", "构建知识图谱", "建立卡片间的关联关系", "organize_cards", "knowledge_graph", "build_connections"),
            WorkflowStep("s6", "生成综述报告", "生成结构化的文献综述报告（PPT/Word）", "generate_ppt", "report_generation", "generate_report",
                params={"format": "ppt", "include_graph": True}),
        ]
    )
    
    # 2. 项目复盘工作流
    PREDEFINED_WORKFLOWS["project_review"] = WorkflowTemplate(
        template_id="project_review",
        name="项目复盘",
        description="对已完成的或进行中的项目进行系统回顾，总结经验教训和最佳实践",
        category="项目管理",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=5,
        estimated_time_minutes=12,
        tags=["项目", "复盘", "总结", "经验"],
        icon="🔄",
        steps=[
            WorkflowStep("s1", "确定复盘项目", "指定要复盘的项目", "complex_workflow", "clarification", "ask_question",
                params={"question": "请输入要复盘的项目名称"},
                requires_input=True, input_prompt="请输入项目名称"),
            WorkflowStep("s2", "搜索项目卡片", "查找该项目相关的所有知识卡片", "search_cards", "knowledge_search", "search_cards_hybrid",
                params={"limit": 30}),
            WorkflowStep("s3", "分析项目数据", "提取关键指标、里程碑和决策点", "analyze_document", "agent_analysis", "analyze_results"),
            WorkflowStep("s4", "总结四色卡片", "生成事实、解释、风险和行动四色卡片", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s5", "生成复盘报告", "生成PPT格式的复盘报告", "generate_ppt", "report_generation", "generate_report",
                params={"format": "ppt", "template": "project_review"}),
        ]
    )
    
    # 3. 竞品分析工作流
    PREDEFINED_WORKFLOWS["competitive_analysis"] = WorkflowTemplate(
        template_id="competitive_analysis",
        name="竞品分析",
        description="系统收集和对比竞品信息，识别优劣势，发现市场机会",
        category="市场分析",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=7,
        estimated_time_minutes=20,
        tags=["竞品", "分析", "市场", "对比"],
        icon="🏆",
        steps=[
            WorkflowStep("s1", "确定分析的竞品", "指定要分析的竞品列表", "complex_workflow", "clarification", "ask_question",
                params={"question": "请输入要分析的竞品名称（可多个，用逗号分隔）"},
                requires_input=True, input_prompt="请输入竞品名称"),
            WorkflowStep("s2", "搜索竞品信息", "搜索知识库中的竞品相关卡片", "search_cards", "knowledge_search", "search_cards_hybrid",
                params={"limit": 30}),
            WorkflowStep("s3", "分析竞品文档", "分析上传的竞品相关文档", "analyze_document", "document_analysis", "analyze_document"),
            WorkflowStep("s4", "提取多维信息", "从产品、技术、市场、用户等维度提取信息", "create_card", "agent_analysis", "multi_dimension_extract"),
            WorkflowStep("s5", "生成四色卡片", "按四色卡片体系组织竞品信息", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s6", "构建对比图谱", "创建竞品间的对比知识图谱", "organize_cards", "knowledge_graph", "build_comparison_graph"),
            WorkflowStep("s7", "生成分析报告", "生成包含SWOT分析的竞品分析PPT报告", "generate_ppt", "report_generation", "generate_report",
                params={"format": "ppt", "template": "competitive_analysis"}),
        ]
    )
    
    # 4. 会议纪要工作流
    PREDEFINED_WORKFLOWS["meeting_minutes"] = WorkflowTemplate(
        template_id="meeting_minutes",
        name="会议纪要",
        description="从会议记录/录音中提取关键信息，生成结构化会议纪要并分配任务",
        category="日常办公",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=4,
        estimated_time_minutes=8,
        tags=["会议", "纪要", "记录", "任务"],
        icon="📋",
        steps=[
            WorkflowStep("s1", "输入会议内容", "提供会议记录文本或相关文件", "complex_workflow", "clarification", "ask_question",
                params={"question": "请提供会议记录文本，或上传会议相关文档"},
                requires_input=True, input_prompt="请输入或上传会议记录"),
            WorkflowStep("s2", "提取会议要点", "从会议内容中提取关键决策和讨论要点", "create_card", "agent_analysis", "extract_key_points"),
            WorkflowStep("s3", "生成四色卡片", "将会议要点转化为四色知识卡片", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s4", "创建待办任务", "提取行动项并创建GTD任务", "manage_tasks", "task_management", "create_tasks_from_cards",
                params={"assign_tasks": True, "set_reminders": True}),
        ]
    )
    
    # 5. 周报生成工作流
    PREDEFINED_WORKFLOWS["weekly_report"] = WorkflowTemplate(
        template_id="weekly_report",
        name="周报生成",
        description="基于本周的工作记录和知识卡片，自动生成结构化周报",
        category="日常办公",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=5,
        estimated_time_minutes=10,
        tags=["周报", "报告", "总结", "工作"],
        icon="📅",
        steps=[
            WorkflowStep("s1", "确定报告周期", "指定周报的时间范围", "complex_workflow", "clarification", "ask_question",
                params={"question": "请指定周报的时间范围（如：本周/上周/自定义日期）"},
                requires_input=True, input_prompt="请输入时间范围"),
            WorkflowStep("s2", "收集本周数据", "搜索时间范围内创建的知识卡片和任务", "search_cards", "knowledge_search", "search_by_timerange",
                params={"time_range": "7d"}),
            WorkflowStep("s3", "汇总工作成果", "分析本周完成的工作和进展", "create_card", "agent_analysis", "summarize_weekly_work"),
            WorkflowStep("s4", "生成四色卡片", "生成本周工作总结卡片", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s5", "导出周报", "生成PPT/Word格式的周报", "generate_ppt", "report_generation", "generate_report",
                params={"format": "ppt", "template": "weekly_report"}),
        ]
    )
    
    # 6. 风险评估工作流
    PREDEFINED_WORKFLOWS["risk_assessment"] = WorkflowTemplate(
        template_id="risk_assessment",
        name="风险评估",
        description="识别和分析项目/业务中的潜在风险，制定应对策略和预防措施",
        category="风险管理",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=6,
        estimated_time_minutes=15,
        tags=["风险", "评估", "安全", "预防"],
        icon="⚠️",
        steps=[
            WorkflowStep("s1", "确定评估范围", "明确风险评估的对象和范围", "complex_workflow", "clarification", "ask_question",
                params={"question": "请明确风险评估的对象和范围"},
                requires_input=True, input_prompt="请输入评估对象"),
            WorkflowStep("s2", "搜索相关信息", "搜索已有的风险和问题卡片", "search_cards", "knowledge_search", "search_cards_hybrid",
                params={"limit": 20, "filter_risk": True}),
            WorkflowStep("s3", "识别风险点", "分析并识别所有潜在的风险因素", "create_card", "agent_analysis", "identify_risks"),
            WorkflowStep("s4", "评估风险等级", "对识别的风险进行分类和等级评估", "create_card", "agent_analysis", "assess_risk_levels"),
            WorkflowStep("s5", "生成对策卡片", "为高风险项生成应对策略（行动卡片）", "create_card", "agent_analysis", "generate_action_cards"),
            WorkflowStep("s6", "生成风险评估报告", "生成包含风险矩阵的评估报告", "generate_ppt", "report_generation", "generate_report",
                params={"format": "ppt", "include_risk_matrix": True}),
        ]
    )
    
    # 7. 知识卡片创建工作流
    PREDEFINED_WORKFLOWS["card_creation"] = WorkflowTemplate(
        template_id="card_creation",
        name="知识卡片创建",
        description="从文本、对话或文档中智能提取和创建四色知识卡片",
        category="知识管理",
        primary_intent=IntentType.CREATE_CARD,
        estimated_steps=3,
        estimated_time_minutes=5,
        tags=["卡片", "创建", "知识", "提取"],
        icon="📝",
        steps=[
            WorkflowStep("s1", "提供内容", "提供要转化为卡片的内容", "create_card", "clarification", "ask_question",
                params={"question": "请提供要转化为知识卡片的内容"},
                requires_input=True, input_prompt="请输入或粘贴内容"),
            WorkflowStep("s2", "8-Agent分析", "使用8智能体分析内容并分类", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s3", "确认并保存", "展示生成的卡片，确认后保存到知识库", "create_card", "knowledge_management", "save_cards_with_review",
                params={"auto_save": False, "show_preview": True}),
        ]
    )
    
    # 8. 文档分析工作流
    PREDEFINED_WORKFLOWS["document_analysis"] = WorkflowTemplate(
        template_id="document_analysis",
        name="文档深度分析",
        description="对上传的PDF/Word/Excel文档进行多维度分析，提取结构化知识",
        category="文档处理",
        primary_intent=IntentType.ANALYZE_DOCUMENT,
        estimated_steps=4,
        estimated_time_minutes=8,
        tags=["文档", "分析", "提取", "PDF"],
        icon="📄",
        steps=[
            WorkflowStep("s1", "上传文档", "上传需要分析的文档", "analyze_document", "file_upload", "upload_document",
                params={"accept": ".pdf,.docx,.xlsx,.pptx"},
                requires_input=True, input_prompt="请上传文档"),
            WorkflowStep("s2", "文档解析", "解析文档内容，提取文本和表格", "analyze_document", "document_parsing", "parse_document"),
            WorkflowStep("s3", "8-Agent分析", "8智能体并行分析文档内容", "create_card", "agent_analysis", "generate_four_color_cards"),
            WorkflowStep("s4", "导出分析结果", "导出分析报告和提取的卡片", "generate_ppt", "report_generation", "export_analysis",
                params={"formats": ["ppt", "cards"]}),
        ]
    )
    
    # 9. 数据分析工作流
    PREDEFINED_WORKFLOWS["data_analysis"] = WorkflowTemplate(
        template_id="data_analysis",
        name="数据分析",
        description="对Excel/CSV数据进行统计分析，生成数据洞察和可视化报告",
        category="数据分析",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=5,
        estimated_time_minutes=12,
        tags=["数据", "分析", "统计", "可视化"],
        icon="📈",
        steps=[
            WorkflowStep("s1", "上传数据文件", "上传Excel/CSV数据文件", "analyze_document", "file_upload", "upload_document",
                params={"accept": ".xlsx,.xls,.csv"},
                requires_input=True, input_prompt="请上传数据文件"),
            WorkflowStep("s2", "数据清洗与预处理", "清理和预处理数据", "analyze_document", "data_preprocessing", "clean_data"),
            WorkflowStep("s3", "统计分析", "执行统计分析和趋势识别", "create_card", "agent_analysis", "statistical_analysis"),
            WorkflowStep("s4", "生成洞察卡片", "生成四色知识卡片总结数据洞察", "create_card", "agent_analysis", "generate_insight_cards"),
            WorkflowStep("s5", "导出分析报告", "生成带图表的分析报告（PPT/Excel）", "generate_ppt", "report_generation", "generate_report",
                params={"format": "ppt", "include_charts": True}),
        ]
    )
    
    # 10. PPT快速生成
    PREDEFINED_WORKFLOWS["quick_ppt"] = WorkflowTemplate(
        template_id="quick_ppt",
        name="PPT快速生成",
        description="基于知识卡片或主题快速生成专业的演示文稿",
        category="报告生成",
        primary_intent=IntentType.GENERATE_PPT,
        estimated_steps=3,
        estimated_time_minutes=5,
        tags=["PPT", "演示", "快速", "生成"],
        icon="🎯",
        steps=[
            WorkflowStep("s1", "确定PPT主题", "指定PPT的主题和风格", "generate_ppt", "clarification", "ask_question",
                params={"question": "请指定PPT的主题、风格偏好和页数要求"},
                requires_input=True, input_prompt="请输入PPT主题"),
            WorkflowStep("s2", "搜索相关卡片", "搜索主题相关的知识卡片作为素材", "search_cards", "knowledge_search", "search_cards_hybrid",
                params={"limit": 15}),
            WorkflowStep("s3", "生成PPT", "自动生成PPT并预览", "generate_ppt", "ppt_generation", "generate_ppt",
                params={"auto_download": True}),
        ]
    )
    
    # 11. 知识图谱构建
    PREDEFINED_WORKFLOWS["kg_build"] = WorkflowTemplate(
        template_id="kg_build",
        name="知识图谱构建",
        description="基于已有的知识卡片，构建领域知识图谱，发现隐藏关联",
        category="知识管理",
        primary_intent=IntentType.ORGANIZE_CARDS,
        estimated_steps=4,
        estimated_time_minutes=8,
        tags=["图谱", "关联", "可视化", "知识"],
        icon="🔗",
        steps=[
            WorkflowStep("s1", "选择范围", "指定构建知识图谱的范围", "organize_cards", "clarification", "ask_question",
                params={"question": "请指定要构建知识图谱的主题范围"},
                requires_input=True, input_prompt="请输入主题范围"),
            WorkflowStep("s2", "提取卡片", "搜索范围内的所有相关卡片", "search_cards", "knowledge_search", "search_all_cards",
                params={"limit": 50}),
            WorkflowStep("s3", "发现关联", "分析卡片间的语义和逻辑关联", "organize_cards", "knowledge_graph", "discover_connections"),
            WorkflowStep("s4", "可视化展示", "生成知识图谱可视化", "organize_cards", "knowledge_graph", "visualize_graph",
                params={"layout": "force_directed"}),
        ]
    )
    
    # 12. GTD任务管理
    PREDEFINED_WORKFLOWS["gtd_management"] = WorkflowTemplate(
        template_id="gtd_management",
        name="GTD任务管理",
        description="基于GTD方法论创建、分类和管理任务清单",
        category="任务管理",
        primary_intent=IntentType.MANAGE_TASKS,
        estimated_steps=4,
        estimated_time_minutes=5,
        tags=["GTD", "任务", "待办", "管理"],
        icon="✅",
        steps=[
            WorkflowStep("s1", "收集任务", "收集所有需要处理的任务", "manage_tasks", "clarification", "ask_question",
                params={"question": "请列出您需要处理的任务"},
                requires_input=True, input_prompt="请列出任务清单"),
            WorkflowStep("s2", "任务分类", "按GTD方法论分类：立即执行/委派/延迟/归档", "manage_tasks", "task_management", "classify_tasks"),
            WorkflowStep("s3", "设置优先级", "设置任务优先级和截止日期", "manage_tasks", "task_management", "set_priorities"),
            WorkflowStep("s4", "生成任务卡片", "为重要任务生成行动卡片", "create_card", "agent_analysis", "generate_action_cards"),
        ]
    )
    
    # 13. 图片分析工作流
    PREDEFINED_WORKFLOWS["image_analysis"] = WorkflowTemplate(
        template_id="image_analysis",
        name="图片智能分析",
        description="上传图片进行分析，提取关键信息和数据，生成知识卡片",
        category="视觉理解",
        primary_intent=IntentType.ANALYZE_IMAGE,
        estimated_steps=3,
        estimated_time_minutes=3,
        tags=["图片", "分析", "视觉", "识别"],
        icon="🖼️",
        steps=[
            WorkflowStep("s1", "上传图片", "上传需要分析的图片", "analyze_image", "file_upload", "upload_image",
                params={"accept": "image/*"},
                requires_input=True, input_prompt="请上传图片"),
            WorkflowStep("s2", "图片内容分析", "使用视觉AI分析图片内容", "analyze_image", "vision_analysis", "analyze_image"),
            WorkflowStep("s3", "生成知识卡片", "将分析结果转化为知识卡片", "create_card", "agent_analysis", "card_from_vision"),
        ]
    )
    
    # 14. 系统诊断工作流
    PREDEFINED_WORKFLOWS["system_diagnosis"] = WorkflowTemplate(
        template_id="system_diagnosis",
        name="系统诊断",
        description="检查系统状态、NPU性能、存储空间等资源使用情况",
        category="系统管理",
        primary_intent=IntentType.CHECK_PERFORMANCE,
        estimated_steps=3,
        estimated_time_minutes=2,
        tags=["系统", "性能", "诊断", "NPU"],
        icon="💻",
        steps=[
            WorkflowStep("s1", "检查NPU状态", "检查NPU使用率和推理性能", "check_performance", "system_monitor", "check_npu_status"),
            WorkflowStep("s2", "检查存储空间", "检查磁盘和数据库存储空间", "check_performance", "system_monitor", "check_storage"),
            WorkflowStep("s3", "生成诊断报告", "汇总系统状态生成诊断报告", "check_performance", "report_generation", "generate_diagnosis_report"),
        ]
    )
    
    # 15. 快速问答
    PREDEFINED_WORKFLOWS["quick_qa"] = WorkflowTemplate(
        template_id="quick_qa",
        name="知识库快速问答",
        description="基于知识库的内容，快速回答用户的提问",
        category="知识查询",
        primary_intent=IntentType.SEARCH_CARDS,
        estimated_steps=2,
        estimated_time_minutes=1,
        tags=["问答", "查询", "快速", "知识"],
        icon="💬",
        steps=[
            WorkflowStep("s1", "语义搜索", "在知识库中进行语义搜索", "search_cards", "knowledge_search", "search_cards_hybrid",
                params={"limit": 5}),
            WorkflowStep("s2", "生成综合回答", "使用LLM综合搜索结果生成自然语言回答", "search_cards", "llm_generation", "synthesize_answer"),
        ]
    )
    
    # 16. 多智能体会议
    PREDEFINED_WORKFLOWS["agent_meeting"] = WorkflowTemplate(
        template_id="agent_meeting",
        name="虚拟朝堂会议",
        description="启动8智能体协作会议，从多个视角分析问题",
        category="智能协作",
        primary_intent=IntentType.COMPLEX_WORKFLOW,
        estimated_steps=3,
        estimated_time_minutes=10,
        tags=["会议", "协作", "分析", "多智能体"],
        icon="🏛️",
        steps=[
            WorkflowStep("s1", "确定议题", "指定会议要讨论的议题", "complex_workflow", "clarification", "ask_question",
                params={"question": "请输入朝堂会议要讨论的议题"},
                requires_input=True, input_prompt="请输入议题"),
            WorkflowStep("s2", "启动多Agent会议", "8个Agent从各自角色发表观点", "complex_workflow", "agent_meeting", "start_agent_meeting"),
            WorkflowStep("s3", "汇总会议卡片", "收集会议中生成的四色卡片并保存", "create_card", "knowledge_management", "save_meeting_cards"),
        ]
    )


# ============ 工作流编排引擎 ============

class WorkflowOrchestrator:
    """工作流编排引擎 - 动态生成和执行工作流"""
    
    def __init__(self):
        """初始化编排引擎"""
        self._active_executions: Dict[str, WorkflowExecution] = {}
        self._templates: Dict[str, WorkflowTemplate] = {}
        self._module_handlers: Dict[str, Callable] = {}
        self._initialized = False
    
    async def initialize(self):
        """初始化引擎"""
        if self._initialized:
            return
        
        _init_workflow_templates()
        self._templates = PREDEFINED_WORKFLOWS
        self._initialized = True
        logger.info(f"[WorkflowOrchestrator] 已加载 {len(self._templates)} 个工作流模板")
    
    def get_all_templates(self) -> List[Dict[str, Any]]:
        """获取所有工作流模板信息"""
        return [
            {
                "template_id": t.template_id,
                "name": t.name,
                "description": t.description,
                "category": t.category,
                "estimated_steps": t.estimated_steps,
                "estimated_time_minutes": t.estimated_time_minutes,
                "tags": t.tags,
                "icon": t.icon,
                "primary_intent": t.primary_intent.value,
            }
            for t in self._templates.values()
        ]
    
    def get_templates_by_intent(self, intent: IntentType) -> List[WorkflowTemplate]:
        """根据意图获取匹配的模板"""
        matching = []
        for template in self._templates.values():
            if template.primary_intent == intent:
                matching.append(template)
        # 按匹配度排序
        return sorted(matching, key=lambda t: t.estimated_steps)
    
    def get_templates_by_category(self, category: str) -> List[WorkflowTemplate]:
        """根据分类获取模板"""
        return [t for t in self._templates.values() if t.category == category]
    
    async def generate_workflow(
        self,
        user_query: str,
        intent_result: IntentResult,
        user_id: str = "default_user"
    ) -> Optional[WorkflowExecution]:
        """
        根据用户意图动态生成工作流执行实例
        
        1. 先查找预置模板
        2. 如果没有匹配模板，动态生成
        """
        await self.initialize()
        
        intent = intent_result.primary_intent
        execution_id = f"wf_{datetime.now().strftime('%Y%m%d%H%M%S')}_{user_id}"
        
        # 查找预置模板
        templates = self.get_templates_by_intent(intent)
        
        if templates:
            # 使用匹配的预置模板
            template = templates[0]
            logger.info(f"[Workflow] 使用预置模板: {template.name} (意图: {intent.value})")
            
            # 深拷贝步骤
            import copy
            steps = copy.deepcopy(template.steps)
            
            # 注入用户查询到第一个需要输入的步骤
            for step in steps:
                if step.requires_input and step.input_prompt:
                    step.params["prefill"] = user_query
            
            execution = WorkflowExecution(
                execution_id=execution_id,
                template_id=template.template_id,
                user_query=user_query,
                user_id=user_id,
                intent_result=intent_result,
                steps=steps,
                status=WorkflowStatus.RUNNING,
                started_at=datetime.now().isoformat(),
                execution_log=[f"[{datetime.now().strftime('%H:%M:%S')}] 启动工作流: {template.name}"]
            )
        else:
            # 动态生成简单工作流
            logger.info(f"[Workflow] 动态生成工作流 (意图: {intent.value})")
            steps = self._generate_dynamic_steps(user_query, intent_result)
            
            execution = WorkflowExecution(
                execution_id=execution_id,
                template_id="dynamic",
                user_query=user_query,
                user_id=user_id,
                intent_result=intent_result,
                steps=steps,
                status=WorkflowStatus.RUNNING,
                started_at=datetime.now().isoformat(),
                execution_log=[f"[{datetime.now().strftime('%H:%M:%S')}] 启动动态工作流"]
            )
        
        self._active_executions[execution_id] = execution
        return execution
    
    def _generate_dynamic_steps(
        self,
        user_query: str,
        intent_result: IntentResult
    ) -> List[WorkflowStep]:
        """动态生成工作流步骤"""
        intent = intent_result.primary_intent
        steps = []
        
        if intent == IntentType.CREATE_CARD:
            steps = [
                WorkflowStep("s1", "内容分析", "分析输入内容", "create_card", "agent_analysis", "analyze_content",
                    params={"query": user_query}),
                WorkflowStep("s2", "生成四色卡片", "使用8-Agent生成四色卡片", "create_card", "agent_analysis", "generate_four_color_cards"),
                WorkflowStep("s3", "保存卡片", "将生成的卡片保存到知识库", "create_card", "knowledge_management", "save_cards"),
            ]
        elif intent == IntentType.SEARCH_CARDS:
            steps = [
                WorkflowStep("s1", "语义搜索", "在知识库中搜索", "search_cards", "knowledge_search", "search_cards_hybrid",
                    params={"query": user_query, "limit": 10}),
                WorkflowStep("s2", "综合回答", "基于搜索结果生成回答", "search_cards", "llm_generation", "synthesize_answer"),
            ]
        elif intent == IntentType.GENERATE_PPT:
            steps = [
                WorkflowStep("s1", "收集素材", "搜索相关卡片", "generate_ppt", "knowledge_search", "search_cards_hybrid",
                    params={"limit": 15}),
                WorkflowStep("s2", "生成PPT", "自动生成演示文稿", "generate_ppt", "ppt_generation", "generate_ppt"),
            ]
        elif intent in [IntentType.GENERAL_CHAT, IntentType.GREETING, IntentType.HELP]:
            steps = [
                WorkflowStep("s1", "生成回复", "使用LLM生成回复", intent.value, "llm_generation", "generate_response",
                    params={"query": user_query}),
            ]
        else:
            steps = [
                WorkflowStep("s1", "执行操作", f"执行{intent.value}操作", intent.value, "execute", "execute_action",
                    params={"query": user_query}),
            ]
        
        return steps
    
    async def execute_step(
        self,
        execution_id: str,
        step_index: int = 0
    ) -> Dict[str, Any]:
        """执行工作流的指定步骤"""
        execution = self._active_executions.get(execution_id)
        if not execution:
            return {"error": "工作流不存在", "execution_id": execution_id}
        
        if step_index >= len(execution.steps):
            return {"status": "completed", "message": "所有步骤已完成"}
        
        step = execution.steps[step_index]
        step.status = WorkflowStatus.RUNNING
        execution.current_step_index = step_index
        
        log_msg = f"[{datetime.now().strftime('%H:%M:%S')}] 执行步骤 {step_index+1}/{len(execution.steps)}: {step.name}"
        execution.execution_log.append(log_msg)
        logger.info(f"[Workflow] {log_msg}")
        
        try:
            # 检查是否需要用户输入
            if step.requires_input:
                step.status = WorkflowStatus.WAITING_INPUT
                return {
                    "status": "waiting_input",
                    "step": step.name,
                    "description": step.description,
                    "prompt": step.input_prompt or "请提供更多信息",
                    "step_index": step_index,
                    "total_steps": len(execution.steps),
                }
            
            # 执行步骤（根据模块路由到具体处理器）
            result = await self._route_and_execute(step, execution)
            step.result = result
            step.status = WorkflowStatus.COMPLETED
            
            # 检查是否有条件分支
            next_step = self._evaluate_conditions(step, execution)
            if next_step is not None:
                next_idx = next(
                    (i for i, s in enumerate(execution.steps) if s.step_id == next_step),
                    step_index + 1
                )
            else:
                next_idx = step_index + 1
            
            return {
                "status": "completed",
                "step": step.name,
                "result": result,
                "step_index": step_index,
                "total_steps": len(execution.steps),
                "next_step_index": next_idx if next_idx < len(execution.steps) else None,
                "execution_log": execution.execution_log,
            }
            
        except Exception as e:
            step.status = WorkflowStatus.FAILED
            step.error = str(e)
            error_msg = f"[{datetime.now().strftime('%H:%M:%S')}] 步骤失败: {e}"
            execution.execution_log.append(error_msg)
            logger.error(f"[Workflow] {error_msg}")
            
            return {
                "status": "failed",
                "step": step.name,
                "error": str(e),
                "step_index": step_index,
                "total_steps": len(execution.steps),
            }
            
        except Exception as e:
            step.status = WorkflowStatus.FAILED
            step.error = str(e)
            error_msg = f"[{datetime.now().strftime('%H:%M:%S')}] 步骤失败: {e}"
            execution.execution_log.append(error_msg)
            logger.error(f"[Workflow] {error_msg}")
            
            return {
                "status": "failed",
                "step": step.name,
                "error": str(e),
                "step_index": step_index,
                "total_steps": len(execution.steps),
            }
    
    async def _try_skill_registry(
        self,
        module: str,
        step: "WorkflowStep",
        execution: "WorkflowExecution"
    ) -> Optional[Dict[str, Any]]:
        """尝试通过 Hermes SkillRegistry 执行工作流步骤"""
        # 查找匹配的技能名
        skill_name = MODULE_SKILL_MAP.get(module)
        if not skill_name:
            return None
        
        registry = _get_skill_registry()
        if not registry:
            return None
        
        skill = registry.get_skill(skill_name)
        if not skill or not skill.enabled:
            logger.debug(f"[Workflow] 技能 {skill_name} 不可用或已禁用")
            return None
        
        try:
            logger.info(f"[Workflow] 通过 SkillRegistry 执行技能: {skill_name}")
            result = await registry.execute_skill(
                skill_name,
                query=execution.user_query,
                params=step.params,
                context=execution.context
            )
            if result.get("success"):
                execution.context[f"{module}_result"] = result.get("result")
                return {
                    "type": f"skill_{module}",
                    "skill": skill_name,
                    "result": result.get("result"),
                    "usage_count": result.get("usage_count", 0),
                }
            logger.warning(f"[Workflow] 技能 {skill_name} 执行失败: {result}")
            return None
        except Exception as e:
            logger.warning(f"[Workflow] 技能 {skill_name} 执行异常，回退: {e}")
            return None
    
    async def _route_and_execute(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """根据模块类型路由（优先尝试 SkillRegistry 技能）"""
        module = step.module
        
        # 尝试通过 SkillRegistry 执行
        skill_result = await self._try_skill_registry(module, step, execution)
        if skill_result is not None:
            return skill_result
        
        if module == "knowledge_search":
            return await self._handle_knowledge_search(step, execution)
        elif module == "agent_analysis":
            return await self._handle_agent_analysis(step, execution)
        elif module == "llm_generation":
            return await self._handle_llm_generation(step, execution)
        elif module == "clarification":
            return {"type": "clarification", "message": step.params.get("question", "")}
        elif module == "report_generation":
            return await self._handle_report_generation(step, execution)
        elif module == "knowledge_management":
            return await self._handle_knowledge_management(step, execution)
        elif module == "task_management":
            return await self._handle_task_management(step, execution)
        elif module == "knowledge_graph":
            return await self._handle_knowledge_graph(step, execution)
        elif module == "file_upload":
            return {"type": "file_upload", "accept": step.params.get("accept", "*")}
        elif module == "system_monitor":
            return await self._handle_system_monitor(step, execution)
        else:
            return {"type": "passthrough", "action": step.action, "params": step.params}
    
    async def _handle_knowledge_search(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理知识搜索"""
        try:
            from routes.enhanced_chat_routes import search_cards_semantic
            cards = search_cards_semantic(execution.user_query, limit=step.params.get("limit", 10))
            
            # 将搜索结果存入执行上下文
            execution.context["search_results"] = cards
            
            return {
                "type": "search_results",
                "cards": [
                    {"id": c.card_id, "title": c.title, "type": c.card_type, "content": c.content[:100]}
                    for c in cards[:5]
                ],
                "total": len(cards),
            }
        except Exception as e:
            logger.warning(f"[Workflow] 知识搜索失败: {e}")
            return {"type": "search_results", "cards": [], "total": 0, "error": str(e)}
    
    async def _handle_agent_analysis(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理8-Agent分析（通政司/监察院/刑狱司/参谋司）"""
        try:
            # 尝试使用8-Agent引擎
            from routes.eight_agent_engine import get_eight_agent_engine
            engine = get_eight_agent_engine()
            
            context = {
                "query": execution.user_query,
                "search_results": execution.context.get("search_results", []),
            }
            
            result = await engine.process(execution.user_query, context, execution.user_id)
            
            if result.get("status") == "success":
                return {
                    "type": "agent_analysis",
                    "four_color_cards": result.get("four_color_cards", []),
                    "report": result.get("report", {}),
                    "logs": result.get("logs", []),
                }
        except Exception as e:
            logger.warning(f"[Workflow] Agent分析失败: {e}")
        
        # 回退：使用Genie LLM模拟分析
        try:
            from routes.enhanced_chat_routes import call_genie
            prompt = f"请分析以下内容并以四色卡片格式总结：{execution.user_query[:500]}"
            response = await call_genie(
                [{"role": "user", "content": prompt}],
                max_tokens=500, timeout_sec=30.0
            )
            return {
                "type": "llm_analysis",
                "analysis": response or "分析进行中...",
                "cards_generated": 0,
            }
        except Exception as e2:
            logger.warning(f"[Workflow] LLM回退也失败: {e2}")
            return {"type": "analysis", "status": "partial", "error": str(e2)}
    
    async def _handle_llm_generation(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理LLM生成"""
        try:
            from routes.enhanced_chat_routes import call_genie
            response = await call_genie(
                [{"role": "user", "content": execution.user_query}],
                max_tokens=500, timeout_sec=30.0
            )
            return {
                "type": "llm_response",
                "content": response or "",
            }
        except Exception as e:
            return {"type": "error", "message": f"LLM调用失败: {e}"}
    
    async def _handle_report_generation(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理报告生成"""
        # 获取搜索和分析结果
        cards = execution.context.get("search_results", [])
        analysis = execution.context.get("analysis_result", {})
        
        return {
            "type": "report_generation",
            "format": step.params.get("format", "ppt"),
            "available_cards": len(cards),
            "has_analysis": bool(analysis),
            "message": f"准备基于{len(cards)}张卡片生成报告",
        }
    
    async def _handle_knowledge_management(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理知识管理"""
        return {
            "type": "knowledge_management",
            "action": step.action,
            "message": "知识管理操作准备就绪",
        }
    
    async def _handle_task_management(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理任务管理"""
        return {
            "type": "task_management",
            "action": step.action,
            "params": step.params,
        }
    
    async def _handle_knowledge_graph(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理知识图谱"""
        try:
            from routes import knowledge_graph
            
            entities = knowledge_graph.search_entities(execution.user_query, limit=10)
            return {
                "type": "knowledge_graph",
                "entities": [{"name": e.name, "type": e.entity_type} for e in entities[:5]],
                "total": len(entities),
            }
        except Exception as e:
            return {"type": "knowledge_graph", "entities": [], "error": str(e)}
    
    async def _handle_system_monitor(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Dict[str, Any]:
        """处理系统监控"""
        try:
            import psutil
            import os
            
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "type": "system_status",
                "cpu_percent": cpu_percent,
                "memory_used_percent": memory.percent,
                "memory_available_gb": round(memory.available / (1024**3), 1),
                "disk_used_percent": disk.percent,
                "disk_free_gb": round(disk.free / (1024**3), 1),
            }
        except Exception as e:
            return {"type": "system_status", "error": str(e)}
    
    def _evaluate_conditions(
        self,
        step: WorkflowStep,
        execution: WorkflowExecution
    ) -> Optional[str]:
        """评估条件分支，返回下一步步骤ID"""
        if not step.conditions:
            return step.next_step_id
        
        for condition in step.conditions:
            field = condition.get("field", "")
            operator = condition.get("operator", "equals")
            value = condition.get("value", "")
            next_id = condition.get("next_step_id", "")
            
            # 获取当前步骤结果中的值
            current_value = None
            if step.result and isinstance(step.result, dict):
                current_value = step.result.get(field)
            
            # 简单条件评估
            if operator == "equals" and str(current_value) == str(value):
                return next_id
            elif operator == "exists" and current_value is not None:
                return next_id
            elif operator == "greater_than" and current_value and value:
                try:
                    if float(current_value) > float(value):
                        return next_id
                except (ValueError, TypeError):
                    pass
        
        return step.next_step_id
    
    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """获取工作流执行状态"""
        execution = self._active_executions.get(execution_id)
        if not execution:
            return None
        
        return {
            "execution_id": execution.execution_id,
            "template_id": execution.template_id,
            "status": execution.status.value,
            "current_step": execution.current_step_index + 1,
            "total_steps": len(execution.steps),
            "started_at": execution.started_at,
            "execution_log": execution.execution_log[-10:],
            "steps": [
                {
                    "name": s.name,
                    "status": s.status.value,
                    "description": s.description,
                }
                for s in execution.steps
            ],
        }
    
    def cancel_execution(self, execution_id: str) -> bool:
        """取消工作流执行"""
        execution = self._active_executions.get(execution_id)
        if execution:
            execution.status = WorkflowStatus.CANCELLED
            execution.execution_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 工作流已取消")
            return True
        return False


# 全局单例
_workflow_orchestrator: Optional[WorkflowOrchestrator] = None


def get_workflow_orchestrator() -> WorkflowOrchestrator:
    """获取工作流编排引擎单例"""
    global _workflow_orchestrator
    if _workflow_orchestrator is None:
        _workflow_orchestrator = WorkflowOrchestrator()
    return _workflow_orchestrator
