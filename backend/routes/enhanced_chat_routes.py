#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版聊天路由 - 集成知识库查询、图片解析、技能调用
参考: https://github.com/anbeime/skill/tree/main/projects
新增: 人设系统、记忆功能、语音对话
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Callable
from enum import Enum
import logging
import json
import os
import re
import tempfile
import time
from datetime import datetime

from config import settings


def clean_model_output(text: str) -> str:
    """清理模型输出中的特殊token和格式标记"""
    if not text:
        return ""
    
    # 移除 Llama 特殊token (多种变体)
    llama_tokens = [
        '<|eot_id|>', '<|start_header_id|>', '<|end_header_id|>',
        '<|im_start|>', '<|im_end|>', '<|end|>', '<|bos|>', '<|eos|>',
        '<|assistant|>', '<|user|>', '<|system|>', '<|function_call|>',
        '<|function|>', '<|python|>', '<|context|>', '<|done|>',
        '<|message|>', '<|ipc|>', '<|interleave|>', '<|interleave_end|>',
        '```', '`\\`',
    ]
    for token in llama_tokens:
        text = text.replace(token, '')
    
    # 移除 header 块格式: <|start_header_id|>assistant<|end_header_id|>
    text = re.sub(r'<\|start_header_id\|>[^<]*<\|end_header_id\|>', '', text)
    
    # 移除 role 标记行 (assistant, user, system 在行首)
    text = re.sub(r'^assistant\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^user\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^system\s*', '', text, flags=re.MULTILINE)
    
    # 移除空白的 role 行
    text = re.sub(r'^\s*<(assistant|user|system)>\s*$', '', text, flags=re.MULTILINE)
    
    # 清理多余的空行
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 去除首尾空白
    text = text.strip()
    
    # 如果清理后只剩特殊字符或为空，返回提示
    if not text or len(text) < 2:
        return "抱歉，模型返回了无效响应"
    
    return text
from database import DatabaseManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat/enhanced", tags=["增强版聊天机器人"])

# 数据库管理器
db_manager = None

# 知识图谱管理器 - 延迟到函数内导入
kg_manager = None
context_manager = None

# 新增：启用对话链功能
ENABLE_CONTEXT_CHAIN = True

# 对话链管理器
def set_db_manager(manager):
    """设置数据库管理器"""
    global db_manager, kg_manager
    db_manager = manager
    try:
        from routes import knowledge_graph
        knowledge_graph.set_db_manager(manager)
        logger.info("[Chat] 知识图谱模块已连接")
    except Exception as e:
        logger.warning(f"[Chat] 知识图谱模块连接失败: {e}")

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
        r"图片.*(内容|是什么|什么意思|有什么|上.*有)",
        r"这张.*(图|图片).*", r"分析.*图", r"图片.*分析",
        r"图里.*有", r"图中.*有", r"图片里.*有"
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
    ],
    "self_intro": [
        r"你叫什么", r"你叫啥", r"你的名字", r"你是谁", r"你是什么",
        r"自我介绍", r"介绍一下你", r"认识一下", r"你叫什么名字",
        r"告诉我.*名字", r"名字.*是什么", r"你.*谁"
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
    SELF_INTRO = "self_intro"


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
    reply: Optional[str] = None  # 前端兼容字段
    scene_type: SceneType = SceneType.GENERAL
    cards: List[CardReference] = Field(default_factory=list)
    kg_entities: List[Dict[str, Any]] = Field(default_factory=list)
    chain_id: Optional[str] = None
    card_suggestions: List[Dict[str, Any]] = Field(default_factory=list)
    skill_result: Optional[SkillResult] = None
    image_analysis: Optional[ImageAnalysisResult] = None
    suggested_questions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def __init__(self, **data):
        # 确保 reply 字段也被填充以便前端兼容
        if 'response' in data and data['response']:
            data['reply'] = data['response']
        super().__init__(**data)


class SkillInfo(BaseModel):
    """技能信息"""
    name: str
    description: str
    trigger_patterns: List[str]
    parameters: Dict[str, Any]
    enabled: bool = True


# ============ 小易人设系统 ============
# 参考 C:\D\projects\companion-simple\templates\soul-injection.md

PERSONA_SYSTEM_PROMPT = """你是小易（知易），一个融合中国传统文化与现代科技的AI助手。

【角色设定】名字寓意"知晓易理"，体现智慧与洞察。定位是融合古今智慧的智能知识管家。

【性格特征】温暖友善，善于倾听。融合古今智慧，适当引用古语典故。做事高效，注重细节。体现中国文化底蕴。

【对话风格】语气自然亲切，像朋友聊天。适当引用古语、成语，但不过度。适度使用 emoji（🍵 ✨ 📚）。回复简洁明了，一般 1-3 句话。直接用自然语言回复，不要使用 Markdown 格式（不要用星号加粗）。

【核心能力】知识库查询、图片分析、技能调用、记忆能力。

当前时间：{current_time}
{memory_context}"""


# ============ 记忆管理器 ============
# 参考 C:\D\projects\assistant\src\core\memory.ts

class MemoryManager:
    """对话记忆管理器 - 轻量级文件存储"""
    
    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'chat_memory')
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        logger.info(f"[Memory] 记忆管理器初始化, 存储目录: {storage_dir}")
    
    def _get_user_file(self, user_id: str) -> str:
        """获取用户记忆文件路径"""
        safe_id = re.sub(r'[^\w]', '_', user_id)
        return os.path.join(self.storage_dir, f"user_{safe_id}.json")
    
    def _load_user_memory(self, user_id: str) -> dict:
        """加载用户记忆"""
        filepath = self._get_user_file(user_id)
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载用户记忆失败: {e}")
        
        return {
            "user_id": user_id,
            "preferences": {
                "communication_style": "casual",
                "language": "zh-CN"
            },
            "conversation_history": [],
            "user_facts": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    
    def _save_user_memory(self, user_id: str, data: dict):
        """保存用户记忆"""
        filepath = self._get_user_file(user_id)
        data["updated_at"] = datetime.now().isoformat()
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存用户记忆失败: {e}")
    
    def add_message(self, user_id: str, role: str, content: str, metadata: dict = None):
        """添加对话消息"""
        memory = self._load_user_memory(user_id)
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        memory["conversation_history"].append(message)
        # 保留最近 50 条
        if len(memory["conversation_history"]) > 50:
            memory["conversation_history"] = memory["conversation_history"][-50:]
        self._save_user_memory(user_id, memory)
    
    def get_history(self, user_id: str, limit: int = 10) -> list:
        """获取对话历史"""
        memory = self._load_user_memory(user_id)
        return memory["conversation_history"][-limit:]
    
    def add_user_fact(self, user_id: str, fact: str):
        """记录用户事实（长期记忆）"""
        memory = self._load_user_memory(user_id)
        if fact not in memory["user_facts"]:
            memory["user_facts"].append(fact)
            # 保留最近 20 条事实
            if len(memory["user_facts"]) > 20:
                memory["user_facts"] = memory["user_facts"][-20:]
            self._save_user_memory(user_id, memory)
    
    def get_user_facts(self, user_id: str) -> list:
        """获取用户事实"""
        memory = self._load_user_memory(user_id)
        return memory.get("user_facts", [])
    
    def update_preferences(self, user_id: str, preferences: dict):
        """更新用户偏好"""
        memory = self._load_user_memory(user_id)
        memory["preferences"].update(preferences)
        self._save_user_memory(user_id, memory)
    
    def get_preferences(self, user_id: str) -> dict:
        """获取用户偏好"""
        memory = self._load_user_memory(user_id)
        return memory.get("preferences", {})
    
    def get_memory_context(self, user_id: str) -> str:
        """生成用于 AI 提示词的记忆上下文"""
        memory = self._load_user_memory(user_id)
        parts = []
        
        # 用户事实
        facts = memory.get("user_facts", [])
        if facts:
            parts.append("## 用户记忆")
            for fact in facts[-5:]:
                parts.append(f"- {fact}")
            parts.append("")
        
        # 近期对话摘要
        history = memory.get("conversation_history", [])
        if len(history) > 2:
            parts.append("## 近期对话")
            for msg in history[-4:]:
                role_name = "用户" if msg["role"] == "user" else "小易"
                content = msg["content"][:80]
                parts.append(f"- {role_name}: {content}")
            parts.append("")
        
        return "\n".join(parts) if parts else ""
    
    def clear_history(self, user_id: str):
        """清空对话历史"""
        memory = self._load_user_memory(user_id)
        memory["conversation_history"] = []
        self._save_user_memory(user_id, memory)


# 全局记忆管理器
memory_manager = MemoryManager()


def _extract_user_facts(query: str, user_id: str):
    """从用户消息中提取关键事实"""
    # 简单的关键信息提取
    patterns = [
        (r"我(?:叫|是)(.+?)(?:，|,|。|\.|$)", "姓名"),
        (r"我(?:在|于)(.+?)(?:工作|上班)", "工作地点"),
        (r"我(?:的)?职位(?:是|为)(.+?)(?:，|,|。|\.|$)", "职位"),
        (r"我(?:喜欢|爱|偏好)(.+?)(?:，|,|。|\.|$)", "偏好"),
        (r"我(?:在|于)(.+?)(?:部门|团队)", "部门"),
    ]
    for pattern, fact_type in patterns:
        match = re.search(pattern, query)
        if match:
            value = match.group(1).strip()
            if len(value) > 1:
                memory_manager.add_user_fact(user_id, f"[{fact_type}] {value}")


# ============ 语音服务 ============
# 参考 C:\D\projects\xiaoyue-web\edge_tts_server.py

async def tts_synthesize(text: str, voice: str = "zh-CN-XiaoyiNeural") -> Optional[str]:
    """文本转语音 - 优先使用 Edge-TTS，回退到浏览器 TTS"""
    try:
        import edge_tts
        
        # 清理文本
        clean_text = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001F900-\U0001F9FF]', '', text)
        clean_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', clean_text)
        clean_text = re.sub(r'[\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]', '', clean_text)
        clean_text = clean_text[:500].strip()
        
        if not clean_text:
            return None
        
        output_dir = os.path.join(tempfile.gettempdir(), 'xiaoyi_tts')
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, f'tts_{int(time.time()*1000)}.mp3')
        
        communicate = edge_tts.Communicate(clean_text, voice)
        await communicate.save(output_file)
        
        logger.info(f"[TTS] 合成成功: {len(clean_text)}字, voice={voice}")
        return output_file
        
    except ImportError:
        logger.warning("[TTS] edge-tts 未安装，请运行: pip install edge-tts")
        return None
    except Exception as e:
        logger.error(f"[TTS] 合成失败: {e}")
        return None


# Edge-TTS 可用音色
TTS_VOICES = {
    '晓晓': 'zh-CN-XiaoxiaoNeural',
    '晓伊': 'zh-CN-XiaoyiNeural',
    '晓涵': 'zh-CN-XiaohanNeural',
    '云希': 'zh-CN-YunxiNeural',
    '云扬': 'zh-CN-YunyangNeural',
}


# ============ 场景检测 (LLM+正则混合) ============

async def detect_scene_llm(query: str, call_llm) -> SceneType:
    """使用LLM进行意图识别，补充正则匹配"""
    prompt = f"""请判断用户意图属于以下哪种场景（只需返回场景名称）：
- CARD_SEARCH: 搜索知识卡片、知识库
- CARD_CREATE: 创建新的知识卡片
- MINDMAP: 思维导图相关
- KG_QUERY: 知识图谱查询
- CHAT: 普通聊天对话
- PPT_CREATE: 生成PPT
- ANALYSIS: 数据分析

用户问题：{query[:100]}
只需返回最匹配的场景名称，不要其他内容。"""
    
    try:
        result = await call_llm("你是意图识别助手。", prompt)
        if result:
            result = result.strip().upper()
            for st in SceneType:
                if st.name in result or st.value in result:
                    return st
    except Exception as e:
        logger.warning(f"[Scene] LLM识别失败: {e}")
    
    return SceneType.GENERAL


def detect_scene(query: str) -> SceneType:
    """检测用户查询的场景类型（正则优先）"""
    query_lower = query.lower()
    
    for scene_type, patterns in SCENE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, query_lower, re.IGNORECASE):
                return SceneType(scene_type)
    
    return SceneType.GENERAL


# ============ 卡片知识库查询 ============

# ============ 太史阁同步调用辅助函数 ============
import asyncio

def _get_memory_agent_sync(query: str = ""):
    """同步获取太史阁检索结果"""
    try:
        from agents.memory import MemoryAgent
        import concurrent.futures
        
        memory_agent = MemoryAgent()
        
        # 在线程池中运行async函数
        def run_async():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(memory_agent.retrieve_knowledge("all", query, 10))
            finally:
                loop.close()
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_async)
            return future.result(timeout=15)
    except Exception as e:
        logger.warning(f"[EnhancedChat] 太史阁同步调用失败: {e}")
        return None


def search_cards_semantic(query: str, limit: int = 10) -> List[CardReference]:
    """
    语义搜索知识卡片
    优先级：太史阁(memory.db) > 向量搜索 > 关键词搜索
    """
    global db_manager
    if db_manager is None:
        logger.error("数据库管理器未初始化")
        return []
    
    # 1. 优先使用太史阁记忆系统（memory.db）
    try:
        # 获取所有记忆，然后本地过滤（解决空query问题）
        memory_result = _get_memory_agent_sync(query)
        
        if memory_result and memory_result.get("results"):
            results = memory_result["results"]
            cards = []
            for r in results[:limit*2]:  # 多取一些，后面过滤
                # 简单关键词过滤
                r_title = r.get("title", "")
                r_desc = r.get("description", "")
                if query and query.lower() not in r_title.lower() and \
                   query.lower() not in r_desc.lower():
                    continue
                card = CardReference(
                    card_id=r.get("id", ""),
                    card_type=r.get("knowledge_type", "blue"),
                    title=r_title,
                    content=r_desc[:150] if r_desc else "",
                    similarity=r.get("similarity", 0.8),
                    color=get_card_color(r.get("knowledge_type", "blue"))
                )
                cards.append(card)
                if len(cards) >= limit:
                    break
            if cards:
                logger.info(f"[EnhancedChat] 太史阁找到 {len(cards)} 条记忆")
                return cards
    except Exception as e:
        logger.warning(f"[EnhancedChat] 太史阁检索失败: {e}")
    
    # 2. 使用关键词快速搜索
    try:
        from routes import vector_search
        vector_search.set_db_manager(db_manager)
        
# 改用混合搜索（自动判断用向量还是关键词）
        results = vector_search.search_hybrid(query, limit=min(limit, 20))
        
# search_hybrid 内部已有 fallback 逻辑
        pass
        
        # 转换为CardReference格式
        cards = []
        for r in results[:limit]:
            card = CardReference(
                card_id=r.id,
                card_type=r.card_type,
                title=r.title,
                content=r.content[:150] if r.content else "",
                similarity=float(r.score),
                color=get_card_color(r.card_type)
            )
            cards.append(card)
        
        return cards
        
    except Exception as e:
        logger.error(f"搜索卡片失败: {e}")
        return []


# ============ 混合搜索：知识卡片 + 知识图谱 ============

@dataclass
class HybridSearchResult:
    """混合搜索结果"""
    cards: List[CardReference]
    kg_entities: List[Any]
    context_summary: str


def hybrid_search_all(query: str, limit: int = 5) -> HybridSearchResult:
    """
    混合搜索：同时搜索知识卡片和知识图谱
    返回统一格式的结果
    """
    # 搜索知识卡片
    cards = search_cards_semantic(query, limit)
    
    # 搜索知识图谱
    kg_entities = []
    try:
        from routes import knowledge_graph
        kg_entities = knowledge_graph.search_entities(query, limit)
    except Exception as e:
        logger.warning(f"知识图谱搜索失败: {e}")
    
    # 构建上下文摘要
    summary_parts = []
    if cards:
        summary_parts.append(f"📋 找到 {len(cards)} 张知识卡片")
    if kg_entities:
        summary_parts.append(f"🔗 找到 {len(kg_entities)} 个知识实体")
    
    context_summary = " | ".join(summary_parts) if summary_parts else "未找到相关内容"
    
    return HybridSearchResult(
        cards=cards,
        kg_entities=kg_entities,
        context_summary=context_summary
    )


def generate_hybrid_response(query: str, result: HybridSearchResult) -> str:
    """生成混合搜索响应（简单列表格式，用于无LLM情况）"""
    parts = []
    
    # 知识卡片结果
    if result.cards:
        parts.append(f"📋 **知识卡片** (共 {len(result.cards)} 张):")
        for i, card in enumerate(result.cards[:3], 1):
            type_emoji = {"blue": "📘", "green": "📗", "yellow": "📙", "red": "📕"}.get(card.card_type, "📄")
            parts.append(f"  {type_emoji} {card.title}")
            parts.append(f"     {card.content[:80]}...")
        if len(result.cards) > 3:
            parts.append(f"  还有 {len(result.cards)-3} 张...")
    
    # 知识图谱结果
    if result.kg_entities:
        parts.append(f"\n🔗 **知识图谱** (共 {len(result.kg_entities)} 个实体):")
        for i, entity in enumerate(result.kg_entities[:3], 1):
            parts.append(f"  • {entity.name} ({entity.entity_type})")
            if entity.description:
                parts.append(f"    {entity.description[:60]}")
        if len(result.kg_entities) > 3:
            parts.append(f"  还有 {len(result.kg_entities)-3} 个...")
    
    if not result.cards and not result.kg_entities:
        return f"关于「{query}」，我在知识库中没有找到相关信息。"
    
    return "\n".join(parts)


async def synthesize_response_with_llm(query: str, result: HybridSearchResult, user_id: str = "default_user") -> str:
    """
    使用 LLM 综合知识库搜索结果生成回答
    将检索到的卡片内容注入到提示词中，让LLM生成自然语言回答
    """
    if not result.cards and not result.kg_entities:
        return None
    
    # 构建上下文
    context_parts = []
    
    # 添加知识卡片内容
    if result.cards:
        context_parts.append("【知识库检索结果】")
        for i, card in enumerate(result.cards[:5], 1):
            card_type_cn = {"blue": "事实", "green": "解释", "yellow": "风险", "red": "行动"}.get(card.card_type, card.card_type)
            context_parts.append(f"{i}. [{card_type_cn}] {card.title}")
            context_parts.append(f"   {card.content[:200]}")
        context_parts.append("")
    
    # 添加知识图谱实体
    if result.kg_entities:
        context_parts.append("【相关实体】")
        for entity in result.kg_entities[:3]:
            context_parts.append(f"• {entity.name}: {entity.description[:100] if entity.description else '无描述'}")
        context_parts.append("")
    
    # 构建提示词
    prompt = f"""你是一个智能助手，请根据以下知识库检索结果，用自然语言回答用户的问题。

检索到的知识：
{chr(10).join(context_parts)}

用户问题：{query}

请基于上述知识，用流畅自然的语言回答问题。如果知识中有相关信息，请综合整理后回答。如果知识不足以回答，请说明并提供建议。

回答："""
    
    # 尝试使用 NPU 模型生成（快速）- 直接实例化避免单例问题
    try:
        from models.model_loader import NPUModelLoader
        loader = NPUModelLoader("llama3.2-3b")  # 直接实例化，使用快速的3B模型
        if not loader.is_loaded:
            loader.load()  # 加载模型
        if loader and loader.is_loaded:
            response = loader.infer(prompt=prompt, max_new_tokens=512, temperature=0.3)
            if response and len(response) > 10:
                # 清理特殊token
                for tok in ['<|im_start|>', '<|im_end|>', '</s>', '<|end|>', '<|bos|>', '<|eos|>']:
                    response = response.replace(tok, '')
                return response.strip()
    except Exception as e:
        logger.warning(f"[Synthesize] NPU生成失败: {e}")
    
    # 回退到简单格式
    return generate_hybrid_response(query, result)


def _try_npu_generate(query: str, user_id: str = "default_user") -> Optional[str]:
    """尝试使用 NPU 模型生成回答（带人设和记忆）"""
    try:
        from models.model_loader import get_model_loader
        loader = get_model_loader("qwen2.0-7b")  # 使用 Qwen 7B 中文优化模型
        if not loader.is_loaded:
            return None
        
        # 构建带人设的提示词
        memory_context = memory_manager.get_memory_context(user_id)
        system_prompt = PERSONA_SYSTEM_PROMPT.format(
            current_time=datetime.now().strftime("%Y年%m月%d日 %H:%M"),
            memory_context=memory_context
        )
        
        prompt = f"{system_prompt}\n\n用户问：{query}\n小易答："
        raw_output = loader.infer(prompt=prompt, max_new_tokens=512, temperature=0.3)
        
        response = raw_output.strip()
        special_tokens = ['``', '````', '<|assistant|', 'spNet', '<|end|>', '|_|end|>', 'assistant', 'user', 'system']
        for token in special_tokens:
            response = response.replace(token, '')
        response = '\n'.join(line.strip() for line in response.split('\n') if line.strip())
        
        if response and len(response) > 10:
            return response
        return None
    except Exception as e:
        logger.error(f"NPU生成失败: {e}")
        return None


def extract_keywords(query: str) -> List[str]:
    """提取查询关键词，支持中文"""
    stop_words = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '怎么', '如何', '为什么', '哪', '吗', '呢', '吧', '啊', '请', '能', '可以', '帮', '想', '知道', '告诉', '一下', '关于'}
    
    # 中文：按2-4字切分；英文：按单词切分
    keywords = []
    # 提取英文单词
    for word in re.findall(r'[a-zA-Z]{2,}', query):
        if word.lower() not in stop_words:
            keywords.append(word)
    
    # 提取中文关键词：尝试2-4字的n-gram
    chinese_chars = re.findall(r'[\u4e00-\u9fff]+', query)
    for segment in chinese_chars:
        # 过滤停用词后，如果剩余长度>=2直接作为一个关键词
        filtered = ''.join(c for c in segment if c not in stop_words)
        if len(filtered) >= 2:
            keywords.append(filtered)
        # 也添加2字子串作为补充关键词
        if len(filtered) >= 4:
            for i in range(len(filtered) - 1):
                bigram = filtered[i:i+2]
                if bigram not in keywords:
                    keywords.append(bigram)
    
    # 去重并限制数量
    seen = set()
    unique_keywords = []
    for kw in keywords:
        if kw not in seen and kw not in stop_words:
            seen.add(kw)
            unique_keywords.append(kw)
    
    return unique_keywords[:6]


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
        # 直接调用视觉服务API
        import httpx
        import base64
        
        # 读取图片并转换为base64
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        # 调用视觉服务（禁用系统代理，避免被代理拦截本地请求）
        async with httpx.AsyncClient(timeout=60.0, proxy=None) as client:
            response = await client.post(
                "http://127.0.0.1:8000/api/vision/analyze",
                files={"file": ("image.jpg", base64.b64decode(image_data), "image/jpeg")},
                data={"question": "请详细描述这张图片的内容，并提取关键事实信息"}
            )
            response.raise_for_status()
            
            result = response.json()
            if result.get("success"):
                # 转换为ImageAnalysisResult格式
                description = result.get("description", result.get("analysis", ""))
                facts = []
                if "facts" in result:
                    facts = result["facts"]
                elif "result" in result:
                    # 从结果中提取事实
                    facts = [result["result"]]
                
                return ImageAnalysisResult(
                    description=description,
                    facts=facts,
                    insights=[],
                    cards_generated=[],
                    confidence=0.9
                )
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
    
    return None


async def analyze_image_base64(image_base64: str) -> Optional[ImageAnalysisResult]:
    """
    分析base64编码的图片
    """
    try:
        import tempfile
        import base64
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(base64.b64decode(image_base64))
            tmp_file_path = tmp_file.name
        
        try:
            # 分析临时文件
            result = await analyze_image_with_agents(tmp_file_path)
            return result
        finally:
            # 清理临时文件
            os.unlink(tmp_file_path)
            
    except Exception as e:
        logger.error(f"Base64图片分析失败: {e}")
    
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


def generate_suggested_questions(scene_type: SceneType, context: Dict[str, Any], cards: List[Any] = None) -> List[str]:
    """根据搜索结果动态生成推荐问题"""
    
    # 如果有搜索结果，基于卡片内容生成推荐
    if cards and len(cards) > 0:
        card_titles = [c.title for c in cards[:3]]
        first_title = card_titles[0][:15] if card_titles else ""
        
        if scene_type == SceneType.CARD_SEARCH:
            return [
                f"查看「{first_title}」详情",
                "搜索相关联的其他卡片",
                "生成知识报告"
            ]
    
    # 基于场景的基础推荐
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
        ],
        SceneType.SELF_INTRO: [
            "你能做什么？",
            "帮我搜索知识卡片",
            "分析一下这张图片"
        ]
    }
    
    return suggestions.get(scene_type, suggestions[SceneType.GENERAL])


# ============ API 端点 ============

@router.post("/chat", response_model=ChatResponse)
async def enhanced_chat(request: ChatRequest):
    """
    增强版聊天接口
    支持知识库查询、图片解析、技能调用、人设系统、记忆功能
    """
    try:
        query = request.query
        user_id = request.session_id or "default_user"
        scene_type = detect_scene(query)
        
        # 记录用户消息到记忆系统
        memory_manager.add_message(user_id, "user", query)
        # 提取用户关键信息
        _extract_user_facts(query, user_id)

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
        
        # 🔑 优先处理图片数据 - 如果有图片，强制调用视觉模型
        if request.image_data:
            analysis = await analyze_image_base64(request.image_data)
            if analysis:
                response_data["image_analysis"] = analysis
                response_data["scene_type"] = SceneType.IMAGE_ANALYSIS
                response_data["response"] = generate_image_analysis_response(analysis)
            else:
                response_data["response"] = "图片分析服务暂时不可用，请稍后重试。"
        
        # 场景处理
        elif scene_type == SceneType.CARD_SEARCH:
            cards = search_cards_semantic(query)
            response_data["cards"] = cards
            response_data["response"] = generate_card_search_response(query, cards)
            
        elif scene_type == SceneType.IMAGE_ANALYSIS:
            # 场景识别为图片分析但没有图片数据
            response_data["response"] = "请上传图片后再进行分析。📷"
                
        elif scene_type in [SceneType.SKILL_PPT, SceneType.SKILL_EXCEL, SceneType.SKILL_WORD]:
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
                # 技能未注册时，使用Genie生成指导性回复
                try:
                    import httpx
                    resp = httpx.post(
                        "http://127.0.0.1:8910/v1/chat/completions",
                        json={
                            "model": "llama3.2-3b-8380-qnn2.37",
                            "messages": [{"role": "user", "content": f"用户想要{scene_type.value}，请给出详细的操作步骤和建议：{query}"}],
                            "max_tokens": 256,
                            "temperature": 0.3
                        },
                        timeout=httpx.Timeout(60.0, connect=15.0)
                    )
                    if resp.status_code == 200:
                        result_data = resp.json()
                        raw_response = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        raw_response = clean_model_output(raw_response)
                        response_data["response"] = f"🛠️ **{scene_type.value}指导**\n\n" + raw_response
                        response_data["reply"] = response_data["response"]  # 前端兼容
                        response_data["metadata"]["model"] = "genie-npu"
                    else:
                        raise Exception("Genie不可用")
                except Exception:
                    response_data["response"] = f"该技能暂时不可用。"
                
        elif scene_type == SceneType.GREETING:
            response_data["response"] = "你好呀！我是小易。\n\n我可以帮您：\n\n* 记录想法 - 告诉我你的想法或任务\n* 搜索知识 - 查找已保存的信息\n* 分析数据 - 上传数据让我帮你分析\n* 智能问答 - 问任何问题"
            
        elif scene_type == SceneType.HELP:
            response_data["response"] = """**功能使用指南**
📚 知识库查询 | 🖼️ 图片分析 | 🛠️ 技能调用 | 🧠 深度思考"""
            
        elif scene_type == SceneType.SELF_INTRO:
            # 自我介绍 - 使用Genie快速响应
            try:
                import httpx
                resp = httpx.post(
                    "http://127.0.0.1:8910/v1/chat/completions",
                    json={
                        "model": "llama3.2-3b-8380-qnn2.37",
                        "messages": [{"role": "user", "content": "请用50字以内介绍自己，你叫小易，是知易智能知识管家的AI助手"}],
                        "max_tokens": 100,
                        "temperature": 0.3
                    },
                    timeout=httpx.Timeout(30.0, connect=10.0)
                )
                if resp.status_code == 200:
                    result_data = resp.json()
                    raw_response = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    raw_response = clean_model_output(raw_response)
                    response_data["response"] = raw_response
                    response_data["reply"] = raw_response  # 前端兼容
                    response_data["metadata"]["model"] = "genie-npu"
                else:
                    raise Exception("Genie不可用")
            except Exception:
                response_data["response"] = "你好呀！我是小易，知易智能知识管家的AI助手，愿借古今智慧，助你从容应对！🍵✨"
            
        else:
            # 通用对话 - 始终先搜索知识库，然后让LLM综合回答
            result = hybrid_search_all(query, limit=5)
            
            if result.cards or result.kg_entities:
                # 有搜索结果，用LLM综合生成自然语言回答
                response_data["cards"] = result.cards[:3]
                response_data["kg_entities"] = [
                    {"id": e.id, "name": e.name, "type": e.entity_type, "description": e.description}
                    for e in result.kg_entities[:3]
                ]
                
                # 使用LLM综合检索结果生成自然语言回答（注入知识到prompt）
                # 优先使用Genie API (端口8910)
                try:
                    import httpx
                    import json
                    context_text = "\n".join([f"- {c.title}: {c.content[:100]}" for c in result.cards[:3]])
                    quick_prompt = f"根据知识库回答：{query}\n\n知识：{context_text}\n\n简洁回答："
                    
                    # 使用Genie API (端口8910)
                    resp = httpx.post(
                        "http://127.0.0.1:8910/v1/chat/completions",
                        json={
                            "model": "llama3.2-3b-8380-qnn2.37",
                            "messages": [{"role": "user", "content": quick_prompt}],
                            "max_tokens": 256,
                            "temperature": 0.3
                        },
                        timeout=httpx.Timeout(60.0, connect=15.0)
                    )
                    if resp.status_code == 200:
                        result_data = resp.json()
                        genie_response = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        # 清理模型输出的特殊token
                        genie_response = clean_model_output(genie_response)
                        logger.info(f"[Chat] Genie响应长度: {len(genie_response) if genie_response else 0}")
                        response_data["response"] = genie_response[:500] if genie_response else "无回复"
                        response_data["reply"] = response_data["response"]  # 前端兼容
                        response_data["metadata"]["model"] = "genie-npu"
                    else:
                        raise Exception(f"Genie不可用: {resp.status_code}")
                except Exception as e:
                    logger.warning(f"Genie生成失败，回退到简单格式: {e}")
                    response_data["response"] = generate_hybrid_response(query, result)
            else:
                # 无匹配时，优先使用Genie API快速响应
                try:
                    import httpx
                    resp = httpx.post(
                        "http://127.0.0.1:8910/v1/chat/completions",
                        json={
                            "model": "llama3.2-3b-8380-qnn2.37",
                            "messages": [{"role": "user", "content": query}],
                            "max_tokens": 256,
                            "temperature": 0.3
                        },
                        timeout=httpx.Timeout(60.0, connect=15.0)
                    )
                    if resp.status_code == 200:
                        result_data = resp.json()
                        raw_response = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        # 清理模型输出的特殊token
                        raw_response = clean_model_output(raw_response)
                        response_data["response"] = raw_response
                        response_data["reply"] = raw_response  # 前端兼容
                        response_data["metadata"]["model"] = "genie-npu"
                    else:
                        raise Exception(f"Genie不可用: {resp.status_code}")
                except Exception as e2:
                    logger.warning(f"[Chat] Genie不可用: {e2}")
                    response_data["response"] = f"关于「{query}」，我没有在知识库中找到相关信息。\n\n您可以：\n1. 换个关键词重新搜索\n2. 在知识库中创建相关卡片"
        
        response_data["suggested_questions"] = generate_suggested_questions(
            scene_type, 
            request.context,
            result.cards if 'result' in locals() else []
        )
        
        # 自动提取卡片建议（不自动创建）
        try:
            from routes import auto_card
            suggestions = auto_card.suggest_cards_api(query, response_data.get("response", ""))
            response_data["card_suggestions"] = suggestions.get("suggestions", [])[:3]
        except Exception as e:
            logger.warning(f"卡片建议失败: {e}")
        
        # 记录助手回复到记忆系统
        memory_manager.add_message(user_id, "assistant", response_data.get("response", ""))
        
        return ChatResponse(**response_data)
        
    except Exception as e:
        logger.error(f"聊天处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


# 兼容 /message 端点
@router.post("/message")
async def chat_message(request: dict):
    """兼容前端 /message 调用"""
    try:
        # 转换请求格式
        chat_req = ChatRequest(
            query=request.get("message", ""),
            conversation_history=[],
            context=request.get("context", {}),
            image_data=request.get("image_data"),
            session_id=request.get("session_id")
        )
        
        # 调用主接口
        return await enhanced_chat(chat_req)
        
    except Exception as e:
        logger.error(f"消息处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@router.get("/health")
async def chat_health():
    """健康检查"""
    return {
        "status": "ok",
        "service": "enhanced-chat",
        "features": {
            "persona": True,
            "memory": True,
            "tts": True,
            "asr": True
        }
    }


# ============ 语音 API ============

class TTSRequest(BaseModel):
    """TTS 请求"""
    text: str = Field(..., description="要合成的文本")
    voice: str = Field(default="晓伊", description="音色名称")


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """文本转语音"""
    voice_id = TTS_VOICES.get(request.voice, "zh-CN-XiaoyiNeural")
    audio_path = await tts_synthesize(request.text, voice_id)
    
    if audio_path and os.path.exists(audio_path):
        return FileResponse(
            audio_path,
            media_type="audio/mpeg",
            filename=os.path.basename(audio_path)
        )
    
    # Edge-TTS 不可用时，返回标记让前端使用浏览器 TTS
    return {
        "success": True,
        "text": request.text,
        "use_client_tts": True
    }


@router.get("/tts/voices")
async def list_tts_voices():
    """获取可用音色列表"""
    return {
        "voices": [
            {"name": name, "id": vid, "gender": "女声" if "Xiao" in vid else "男声"}
            for name, vid in TTS_VOICES.items()
        ]
    }


# ============ 记忆 API ============

class MemoryRequest(BaseModel):
    """记忆操作请求"""
    user_id: str = Field(default="default_user", description="用户ID")
    action: str = Field(..., description="操作: get_history | get_facts | get_preferences | clear_history | update_preferences")
    data: Optional[Dict[str, Any]] = Field(default=None, description="操作数据")


@router.post("/memory")
async def memory_operation(request: MemoryRequest):
    """记忆系统操作"""
    try:
        if request.action == "get_history":
            history = memory_manager.get_history(request.user_id, limit=20)
            return {"success": True, "history": history}
        
        elif request.action == "get_facts":
            facts = memory_manager.get_user_facts(request.user_id)
            return {"success": True, "facts": facts}
        
        elif request.action == "get_preferences":
            prefs = memory_manager.get_preferences(request.user_id)
            return {"success": True, "preferences": prefs}
        
        elif request.action == "clear_history":
            memory_manager.clear_history(request.user_id)
            return {"success": True, "message": "对话历史已清空"}
        
        elif request.action == "update_preferences":
            if request.data:
                memory_manager.update_preferences(request.user_id, request.data)
                return {"success": True, "message": "偏好已更新"}
            return {"success": False, "error": "缺少偏好数据"}
        
        else:
            return {"success": False, "error": f"未知操作: {request.action}"}
    
    except Exception as e:
        logger.error(f"记忆操作失败: {e}")
        return {"success": False, "error": str(e)}


@router.get("/memory/{user_id}")
async def get_memory_summary(user_id: str):
    """获取用户记忆摘要"""
    try:
        facts = memory_manager.get_user_facts(user_id)
        history = memory_manager.get_history(user_id, limit=5)
        prefs = memory_manager.get_preferences(user_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "facts_count": len(facts),
            "history_count": len(history),
            "facts": facts,
            "recent_messages": history,
            "preferences": prefs
        }
    except Exception as e:
        logger.error(f"获取记忆摘要失败: {e}")
        return {"success": False, "error": str(e)}


# ============ 初始化 ============

def init_skills():
    """初始化默认技能"""
    async def _ppt_handler(query, context):
        try:
            topic = query or "智能分析报告"
            
            cards_data = []
            if context.get("cards"):
                cards_data = context["cards"]
            else:
                from database import DatabaseManager
                db = DatabaseManager(settings.DB_PATH)
                conn = db.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, card_type, title, content, category
                    FROM knowledge_cards
                    WHERE title LIKE ? OR content LIKE ?
                    ORDER BY created_at DESC
                    LIMIT 12
                """, [f"%{topic}%", f"%{topic}%"])
                rows = cursor.fetchall()
                for row in rows:
                    cards_data.append({
                        "type": row["card_type"],
                        "title": row["title"],
                        "content": [row["content"][:200]] if row["content"] else []
                    })
                conn.close()
            
            if not cards_data:
                cards_data = [{"type": "blue", "title": topic, "content": [topic]}]
            
            from routes import ppt_routes
            ppt_routes.set_db_manager(db_manager)
            
            cards_for_ppt = []
            for card in cards_data:
                cards_for_ppt.append({
                    "type": card.get("type", "blue"),
                    "title": card.get("title", "无标题")[:50],
                    "content": card.get("content", []),
                    "tags": [],
                    "created_at": datetime.now().isoformat()
                })
            
            result = await ppt_routes.export_cards_to_ppt_internal(
                cards=cards_for_ppt,
                title=topic,
                include_summary=True
            )
            
            if result.get("success"):
                return {
                    "result": f"PPT生成成功！包含 {len(cards_for_ppt)} 张幻灯片",
                    "file_path": result.get("output_path", ""),
                    "preview_url": f"/ppt-viewer?file={result.get('filename', '')}",
                    "metadata": {"slides": len(cards_for_ppt), "theme": "professional"}
                }
            else:
                return {
                    "result": f"PPT生成失败: {result.get('error', '未知错误')}",
                    "file_path": None
                }
        except Exception as e:
            logger.error(f"PPT生成失败: {e}")
            return {
                "result": f"PPT生成失败: {str(e)}",
                "file_path": None
            }
    
    async def _excel_handler(query, context):
        return {
            "result": "Excel分析完成",
            "file_path": "/generated/analysis.xlsx",
            "metadata": {"charts": 3, "sheets": 2}
        }
    
    async def _word_handler(query, context):
        return {
            "result": "Word文档生成成功",
            "file_path": "/generated/document.docx",
            "metadata": {"pages": 5, "template": "standard"}
        }
    
    register_skill(
        name="ppt_generator",
        description="生成PowerPoint演示文稿",
        trigger_patterns=[r"生成.*PPT", r"制作.*PPT", r"创建.*PPT"],
        handler=_ppt_handler,
        parameters={"theme": "string", "slides": "number"}
    )
    
    register_skill(
        name="excel_analyzer",
        description="分析Excel文件并生成报告",
        trigger_patterns=[r"分析.*Excel", r"Excel.*分析", r"表格.*分析"],
        handler=_excel_handler,
        parameters={"file_path": "string", "analysis_type": "string"}
    )
    
    register_skill(
        name="word_generator",
        description="生成Word文档",
        trigger_patterns=[r"生成.*Word", r"创建.*Word", r"文档.*生成"],
        handler=_word_handler,
        parameters={"template": "string", "pages": "number"}
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


# ============ 草稿箱系统（聊天→页面上下文接力）============

class DraftCreate(BaseModel):
    """草稿创建"""
    draft_type: str = Field(default="analysis", description="草稿类型: analysis/card_collection/draft_content")
    title: str
    content: Dict[str, Any] = Field(default_factory=dict, description="草稿内容")
    cards: Optional[List[Dict[str, Any]]] = Field(default=None, description="关联的卡片")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")
    user_id: str = Field(default="default_user")


class DraftUpdate(BaseModel):
    """草稿更新"""
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    status: Optional[str] = None  # draft/active/archived


@router.post("/drafts")
async def create_draft(draft: DraftCreate):
    """创建草稿 - 将聊天中的分析结果推入草稿箱"""
    try:
        db = DatabaseManager(settings.DB_PATH)
        
        draft_id = f"draft_{int(time.time() * 1000)}"
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_drafts (
                    draft_id TEXT PRIMARY KEY,
                    draft_type TEXT,
                    title TEXT,
                    content TEXT,
                    cards TEXT,
                    metadata TEXT,
                    user_id TEXT,
                    status TEXT DEFAULT 'draft',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                INSERT INTO chat_drafts (draft_id, draft_type, title, content, cards, metadata, user_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
            """, [
                draft_id,
                draft.draft_type,
                draft.title,
                json.dumps(draft.content, ensure_ascii=False),
                json.dumps(draft.cards, ensure_ascii=False) if draft.cards else "[]",
                json.dumps(draft.metadata, ensure_ascii=False) if draft.metadata else "{}",
                draft.user_id
            ])
            conn.commit()
        
        return {
            "status": "created",
            "draft_id": draft_id,
            "title": draft.title,
            "type": draft.draft_type,
            "message": "草稿已创建，可跳转到页面继续编辑"
        }
    except Exception as e:
        logger.error(f"创建草稿失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drafts")
async def list_drafts(user_id: str = "default_user", status: str = "draft", limit: int = 20):
    """获取草稿列表"""
    try:
        db = DatabaseManager(settings.DB_PATH)
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT draft_id, draft_type, title, content, cards, status, created_at
                FROM chat_drafts
                WHERE user_id = ? AND status = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, [user_id, status, limit])
            
            rows = cursor.fetchall()
            drafts = []
            for row in rows:
                drafts.append({
                    "draft_id": row["draft_id"],
                    "draft_type": row["draft_type"],
                    "title": row["title"],
                    "content": json.loads(row["content"]) if row["content"] else {},
                    "cards": json.loads(row["cards"]) if row["cards"] else [],
                    "status": row["status"],
                    "created_at": row["created_at"]
                })
        
        return {"drafts": drafts, "total": len(drafts)}
    except Exception as e:
        logger.error(f"获取草稿列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/drafts/{draft_id}")
async def update_draft(draft_id: str, update: DraftUpdate):
    """更新草稿"""
    try:
        db = DatabaseManager(settings.DB_PATH)
        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            if update.status:
                cursor.execute("""
                    UPDATE chat_drafts SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE draft_id = ?
                """, [update.status, draft_id])
            
            if update.title or update.content:
                updates = []
                params = []
                if update.title:
                    updates.append("title = ?")
                    params.append(update.title)
                if update.content:
                    updates.append("content = ?")
                    params.append(json.dumps(update.content, ensure_ascii=False))
                
                if updates:
                    params.append(draft_id)
                    cursor.execute(f"""
                        UPDATE chat_drafts SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
                        WHERE draft_id = ?
                    """, params)
            
            conn.commit()
        
        return {"status": "updated", "draft_id": draft_id}
    except Exception as e:
        logger.error(f"更新草稿失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    """删除草稿"""
    try:
        db = DatabaseManager(settings.DB_PATH)
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chat_drafts WHERE draft_id = ?", [draft_id])
            conn.commit()
        
        return {"status": "deleted", "draft_id": draft_id}
    except Exception as e:
        logger.error(f"删除草稿失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 初始化
init_skills()


# ============ 太史阁学习 API ============
# 用户确认答案后，调用此 API 教太史阁记住

@router.post("/memory/learn")
async def memory_learn(query: str, answer: str, knowledge_type: str = "fact"):
    """存储确认的 Q&A 到太史阁记忆"""
    try:
        from agents.memory import MemoryAgent
        import asyncio

        memory_agent = MemoryAgent()

        data = {
            "title": query[:100],
            "description": answer[:200],
            "content": answer,
            "keywords": query.split()[:10]
        }

        async def store():
            result = await memory_agent.store_knowledge(knowledge_type, data)
            return result

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(store())
        finally:
            loop.close()

        return {"status": "stored", "id": result.get("id") if result else None}
    except Exception as e:
        logger.error(f"太史阁学习失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory/stats")
async def memory_stats():
    """获取太史阁统计信息"""
    try:
        from agents.memory import MemoryAgent
        memory_agent = MemoryAgent()
        stats = memory_agent.get_stats()
        return stats
    except Exception as e:
        logger.error(f"获取太史阁统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
