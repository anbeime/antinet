#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版聊天路由 - 集成知识库查询、图片解析、技能调用
参考: https://github.com/anbeime/skill/tree/main/projects
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Callable
from enum import Enum
import logging
import json
import os
import re
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat/enhanced", tags=["增强版聊天机器人"])

# 数据库管理器
db_manager = None

# 技能注册表
skill_registry: Dict[str, Dict[str, Any]] = {}

# 场景检测模式
SCENE_PATTERNS = {
    "card_search": [
        r"查.*卡片", r"找.*知识", r"搜索.*卡片", r"知识库.*查询",
        r"卡片.*(在哪|在哪里|在哪裡)", r"有.*(事实|解释|风险|行动).*卡片"
    ],
    "image_analysis": [
        r"分析.*图片", r"解析.*图片", r"识别.*图片", r"看图",
        r"图片.*(内容|是什么|什么意思)", r"这张.*(图|图片).*"
    ],
    "skill_ppt": [
        r"生成.*PPT", r"制作.*PPT", r"创建.*PPT", r"做.*PPT",
        r"PPT.*(生成|制作|创建)", r"幻灯片.*(生成|制作)"
    ],
    "skill_excel": [
        r"生成.*Excel", r"制作.*Excel", r"创建.*Excel", r"做.*Excel",
        r"Excel.*(生成|制作|创建)", r"表格.*(生成|制作|分析)"
    ],
    "skill_word": [
        r"生成.*Word", r"制作.*Word", r"创建.*Word", r"做.*Word",
        r"Word.*(生成|制作|创建)", r"文档.*(生成|制作)"
    ],
    "greeting": [
        r"^你好", r"^您好", r"^嗨", r"^Hello", r"^Hi",
        r"在吗", r"在嘛", r"在不在"
    ],
    "help": [
        r"帮助", r"怎么用", r"功能", r"能做什么", r"有什么功能",
        r"如何使用", r"说明"
    ]
}


class MessageRole(str, Enum):
    """消息角色"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    SKILL = "skill"


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="角色: user|assistant|system|skill")
    content: str = Field(..., description="消息内容")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="附加元数据")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())


class CardReference(BaseModel):
    """卡片引用"""
    card_id: str
    card_type: str
    title: str
    content: str
    similarity: float
    color: str


class SkillResult(BaseModel):
    """技能执行结果"""
    skill_name: str
    success: bool
    result: Optional[str] = None
    file_path: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ImageAnalysisResult(BaseModel):
    """图片分析结果"""
    description: str
    facts: List[str]
    insights: List[str]
    cards_generated: List[CardReference]
    confidence: float


class SceneType(str, Enum):
    """场景类型"""
    GENERAL = "general"
    CARD_SEARCH = "card_search"
    IMAGE_ANALYSIS = "image_analysis"
    SKILL_PPT = "skill_ppt"
    SKILL_EXCEL = "skill_excel"
    SKILL_WORD = "skill_word"
    GREETING = "greeting"
    HELP = "help"


class ChatRequest(BaseModel):
    """聊天请求"""
    query: str = Field(..., description="用户查询")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="对话历史")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")
    image_data: Optional[str] = Field(None, description="Base64编码的图片数据")
    session_id: Optional[str] = Field(None, description="会话ID")


class ChatResponse(BaseModel):
    """聊天响应"""
    response: str
    scene_type: SceneType = SceneType.GENERAL
    cards: List[CardReference] = Field(default_factory=list)
    skill_result: Optional[SkillResult] = None
    image_analysis: Optional[ImageAnalysisResult] = None
    suggested_questions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SkillInfo(BaseModel):
    """技能信息"""
    name: str
    description: str
    trigger_patterns: List[str]
    parameters: Dict[str, Any]
    enabled: bool = True


# ============ 场景检测 ============

def detect_scene(query: str) -> SceneType:
    """检测用户查询的场景类型"""
    query_lower = query.lower()
    
    for scene_type, patterns in SCENE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, query_lower, re.IGNORECASE):
                return SceneType(scene_type)
    
    return SceneType.GENERAL


# ============ 卡片知识库查询 ============

def search_cards_semantic(query: str, limit: int = 5) -> List[CardReference]:
    """
    语义搜索知识卡片
    支持关键词匹配和相似度排序
    """
    global db_manager
    if db_manager is None:
        logger.error("数据库管理器未初始化")
        return []
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 提取关键词
        keywords = extract_keywords(query)
        
        # 构建查询条件
        conditions = []
        params = []
        
        for keyword in keywords:
            conditions.append("(title LIKE ? OR content LIKE ? OR tags LIKE ?)")
            params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])
        
        if not conditions:
            return []
        
        where_clause = " OR ".join(conditions)
        
        # 执行搜索
        cursor.execute(f"""
            SELECT card_id, card_type, title, content, category,
                   CASE 
                       WHEN title LIKE ? THEN 1.0
                       WHEN content LIKE ? THEN 0.8
                       ELSE 0.5
                   END as similarity
            FROM cards
            WHERE {where_clause}
            ORDER BY similarity DESC, created_at DESC
            LIMIT ?
        """, [f"%{query}%", f"%{query}%"] + params + [limit])
        
        cards = []
        for row in cursor.fetchall():
            card = CardReference(
                card_id=row[0],
                card_type=row[1],
                title=row[2],
                content=row[3][:500] if row[3] else "",  # 限制内容长度
                similarity=row[5],
                color=get_card_color(row[1])
            )
            cards.append(card)
        
        return cards
        
    except Exception as e:
        logger.error(f"搜索卡片失败: {e}")
        return []


def extract_keywords(query: str) -> List[str]:
    """提取查询关键词"""
    # 移除停用词
    stop_words = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'}
    
    words = []
    for word in re.findall(r'\b\w+\b', query):
        if word not in stop_words and len(word) > 1:
            words.append(word)
    
    return words[:5]  # 最多返回5个关键词


def get_card_color(card_type: str) -> str:
    """根据卡片类型获取颜色"""
    color_map = {
        "事实": "blue",
        "解释": "green",
        "风险": "yellow",
        "行动": "red",
        "fact": "blue",
        "explanation": "green",
        "risk": "yellow",
        "action": "red"
    }
    return color_map.get(card_type.lower(), "gray")


# ============ 图片解析 ============

async def analyze_image_with_agents(image_path: str) -> Optional[ImageAnalysisResult]:
    """
    使用智能体分析图片
    参考: projects/assistant/src/core/agent.ts
    """
    try:
        # 检查是否存在智能体视觉服务
        from services.agent_vision_service import AgentVisionService
        
        vision_service = AgentVisionService()
        result = await vision_service.analyze_image(image_path)
        
        if result:
            return ImageAnalysisResult(
                description=result.get("description", ""),
                facts=result.get("facts", []),
                insights=result.get("insights", []),
                cards_generated=result.get("cards", []),
                confidence=result.get("confidence", 0.8)
            )
        
    except ImportError:
        logger.warning("智能体视觉服务不可用")
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
    
    return None


# ============ 技能系统 ============

def register_skill(name: str, description: str, trigger_patterns: List[str], 
                   handler: Callable, parameters: Dict[str, Any] = None):
    """注册技能"""
    skill_registry[name] = {
        "name": name,
        "description": description,
        "trigger_patterns": trigger_patterns,
        "handler": handler,
        "parameters": parameters or {},
        "enabled": True
    }
    logger.info(f"技能已注册: {name}")


def find_matching_skill(query: str) -> Optional[str]:
    """查找匹配的技能"""
    query_lower = query.lower()
    
    for name, skill in skill_registry.items():
        if not skill["enabled"]:
            continue
            
        for pattern in skill["trigger_patterns"]:
            if re.search(pattern, query_lower, re.IGNORECASE):
                return name
    
    return None


async def execute_skill(skill_name: str, query: str, context: Dict[str, Any]) -> SkillResult:
    """执行技能"""
    if skill_name not in skill_registry:
        return SkillResult(
            skill_name=skill_name,
            success=False,
            error="技能未找到"
        )
    
    skill = skill_registry[skill_name]
    
    try:
        result = await skill["handler"](query, context)
        return SkillResult(
            skill_name=skill_name,
            success=True,
            result=result.get("result"),
            file_path=result.get("file_path"),
            metadata=result.get("metadata", {})
        )
    except Exception as e:
        logger.error(f"技能执行失败 {skill_name}: {e}")
        return SkillResult(
            skill_name=skill_name,
            success=False,
            error=str(e)
        )


# ============ 响应生成 ============

def generate_card_search_response(query: str, cards: List[CardReference]) -> str:
    """生成卡片搜索结果响应"""
    if not cards:
        return "抱歉，我在知识库中没有找到相关的卡片。您可以尝试使用其他关键词，或者创建新的知识卡片。"
    
    response = f"为您找到 {len(cards)} 张相关卡片：\n\n"
    
    for i, card in enumerate(cards[:3], 1):
        response += f"{i}. **{card.title}** ({card.card_type})\n"
        response += f"   {card.content[:150]}...\n"
        response += f"   相似度: {card.similarity:.1%}\n\n"
    
    if len(cards) > 3:
        response += f"还有 {len(cards) - 3} 张相关卡片...\n"
    
    return response


def generate_image_analysis_response(analysis: ImageAnalysisResult) -> str:
    """生成图片分析响应"""
    response = "📷 **图片分析结果**\n\n"
    response += f"**描述**: {analysis.description}\n\n"
    
    if analysis.facts:
        response += "**识别到的事实**:\n"
        for fact in analysis.facts[:5]:
            response += f"• {fact}\n"
        response += "\n"
    
    if analysis.insights:
        response += "**洞察分析**:\n"
        for insight in analysis.insights[:3]:
            response += f"• {insight}\n"
        response += "\n"
    
    if analysis.cards_generated:
        response += f"已自动生成 {len(analysis.cards_generated)} 张知识卡片\n"
    
    response += f"\n置信度: {analysis.confidence:.1%}"
    
    return response


def generate_skill_response(skill_result: SkillResult) -> str:
    """生成技能执行响应"""
    if not skill_result.success:
        return f"❌ 技能执行失败: {skill_result.error}"
    
    response = f"✅ **{skill_result.skill_name}** 执行成功！\n\n"
    
    if skill_result.result:
        response += f"{skill_result.result}\n\n"
    
    if skill_result.file_path:
        response += f"📄 文件已保存: `{skill_result.file_path}`\n"
    
    return response


def generate_suggested_questions(scene_type: SceneType, context: Dict[str, Any]) -> List[str]:
    """生成建议问题"""
    suggestions = {
        SceneType.GENERAL: [
            "帮我搜索关于项目管理的知识卡片",
            "分析一下这张图片",
            "生成一个工作总结的PPT"
        ],
        SceneType.CARD_SEARCH: [
            "显示更多相关卡片",
            "这些卡片之间有什么联系？",
            "基于这些卡片生成报告"
        ],
        SceneType.IMAGE_ANALYSIS: [
            "基于分析结果生成知识卡片",
            "这张图片的关键点是什么？",
            "图片中的数据趋势如何？"
        ],
        SceneType.SKILL_PPT: [
            "帮我生成另一个主题的PPT",
            "修改PPT的样式",
            "导出PPT为PDF"
        ],
        SceneType.SKILL_EXCEL: [
            "分析这个Excel文件",
            "生成数据可视化图表",
            "导出分析结果"
        ],
        SceneType.HELP: [
            "如何搜索知识卡片？",
            "支持哪些技能？",
            "如何分析图片？"
        ]
    }
    
    return suggestions.get(scene_type, suggestions[SceneType.GENERAL])


# ============ API 端点 ============

@router.post("/chat", response_model=ChatResponse)
async def enhanced_chat(request: ChatRequest):
    """
    增强版聊天接口
    支持知识库查询、图片解析、技能调用
    """
    try:
        query = request.query
        scene_type = detect_scene(query)
        
        response_data = {
            "scene_type": scene_type,
            "cards": [],
            "skill_result": None,
            "image_analysis": None,
            "suggested_questions": [],
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "session_id": request.session_id
            }
        }
        
        # 场景处理
        if scene_type == SceneType.CARD_SEARCH:
            # 卡片知识库查询
            cards = search_cards_semantic(query)
            response_data["cards"] = cards
            response_data["response"] = generate_card_search_response(query, cards)
            
        elif scene_type == SceneType.IMAGE_ANALYSIS and request.image_data:
            # 图片解析
            # TODO: 保存base64图片并分析
            analysis = await analyze_image_with_agents(request.image_data)
            if analysis:
                response_data["image_analysis"] = analysis
                response_data["response"] = generate_image_analysis_response(analysis)
            else:
                response_data["response"] = "图片分析服务暂时不可用，请稍后重试。"
                
        elif scene_type in [SceneType.SKILL_PPT, SceneType.SKILL_EXCEL, SceneType.SKILL_WORD]:
            # 技能调用
            skill_map = {
                SceneType.SKILL_PPT: "ppt_generator",
                SceneType.SKILL_EXCEL: "excel_analyzer",
                SceneType.SKILL_WORD: "word_generator"
            }
            
            skill_name = skill_map.get(scene_type)
            if skill_name and skill_name in skill_registry:
                skill_result = await execute_skill(skill_name, query, request.context)
                response_data["skill_result"] = skill_result
                response_data["response"] = generate_skill_response(skill_result)
            else:
                response_data["response"] = f"该技能暂时不可用。您可以尝试其他功能，如搜索知识卡片或分析图片。"
                
        elif scene_type == SceneType.GREETING:
            response_data["response"] = "你好！我是知易智能知识管家助手。\n\n我可以帮您：\n📚 查询知识库卡片\n🖼️ 分析图片内容\n📊 生成PPT/Excel/Word文档\n\n有什么可以帮您的吗？"
            
        elif scene_type == SceneType.HELP:
            response_data["response"] = """**功能使用指南**

📚 **知识库查询**
• "搜索关于项目管理的卡片"
• "查找事实类卡片"
• "有哪些关于风险的知识？"

🖼️ **图片分析**
• 上传图片并问"分析这张图片"
• "这张图表说明了什么？"
• "从图片中提取关键信息"

🛠️ **技能调用**
• "生成一个工作总结PPT"
• "分析这个Excel文件"
• "创建一份Word文档"

💡 **提示**: 支持自然语言对话，直接说出您的需求即可！"""
            
        else:
            # 通用对话 - 尝试搜索相关卡片作为上下文
            cards = search_cards_semantic(query, limit=3)
            if cards:
                response_data["cards"] = cards
                context_info = "\n".join([f"- {c.title}: {c.content[:100]}..." for c in cards[:2]])
                response_data["response"] = f"根据知识库中的相关信息：\n\n{context_info}\n\n关于您的问题，我可以进一步帮您分析或基于这些知识生成文档。您需要我做什么？"
            else:
                response_data["response"] = "我理解您的问题。目前知识库中没有直接相关的卡片，但我可以帮您：\n1. 创建新的知识卡片\n2. 基于您的需求生成文档\n3. 分析相关数据\n\n请告诉我具体需要什么帮助？"
        
        # 生成建议问题
        response_data["suggested_questions"] = generate_suggested_questions(scene_type, request.context)
        
        return ChatResponse(**response_data)
        
    except Exception as e:
        logger.error(f"聊天处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@router.post("/analyze-image")
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """图片分析端点"""
    try:
        # 保存上传的图片
        upload_dir = "uploads/temp"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 分析图片
        analysis = await analyze_image_with_agents(file_path)
        
        if analysis:
            return {
                "success": True,
                "analysis": analysis.dict()
            }
        else:
            return {
                "success": False,
                "error": "图片分析失败"
            }
            
    except Exception as e:
        logger.error(f"图片分析端点错误: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/skills", response_model=List[SkillInfo])
async def list_skills():
    """获取所有可用技能"""
    skills = []
    for name, skill in skill_registry.items():
        skills.append(SkillInfo(
            name=skill["name"],
            description=skill["description"],
            trigger_patterns=skill["trigger_patterns"],
            parameters=skill["parameters"],
            enabled=skill["enabled"]
        ))
    return skills


@router.post("/skills/{skill_name}/execute")
async def execute_skill_endpoint(skill_name: str, request: ChatRequest):
    """直接执行指定技能"""
    if skill_name not in skill_registry:
        raise HTTPException(status_code=404, detail=f"技能 '{skill_name}' 不存在")
    
    result = await execute_skill(skill_name, request.query, request.context)
    return result


# ============ 初始化 ============

def init_skills():
    """初始化默认技能"""
    # PPT生成技能
    register_skill(
        name="ppt_generator",
        description="生成PowerPoint演示文稿",
        trigger_patterns=[r"生成.*PPT", r"制作.*PPT", r"创建.*PPT"],
        handler=lambda query, context: {
            "result": "PPT生成成功",
            "file_path": "/generated/presentation.pptx",
            "metadata": {"slides": 10, "theme": "professional"}
        },
        parameters={"theme": "string", "slides": "number"}
    )
    
    # Excel分析技能
    register_skill(
        name="excel_analyzer",
        description="分析Excel文件并生成报告",
        trigger_patterns=[r"分析.*Excel", r"Excel.*分析", r"表格.*分析"],
        handler=lambda query, context: {
            "result": "Excel分析完成",
            "file_path": "/generated/analysis.xlsx",
            "metadata": {"charts": 3, "sheets": 2}
        },
        parameters={"file_path": "string", "analysis_type": "string"}
    )
    
    # Word生成技能
    register_skill(
        name="word_generator",
        description="生成Word文档",
        trigger_patterns=[r"生成.*Word", r"创建.*Word", r"文档.*生成"],
        handler=lambda query, context: {
            "result": "Word文档生成成功",
            "file_path": "/generated/document.docx",
            "metadata": {"pages": 5, "template": "standard"}
        },
        parameters={"template": "string", "pages": "number"}
    )
    
    logger.info(f"已初始化 {len(skill_registry)} 个技能")


# 初始化
init_skills()
