#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
意图识别系统 - 9大核心意图 + 复杂意图组合识别
三层识别：正则快速匹配 → LLM语义理解 → 组合意图解析
"""
import re
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)


class IntentType(str, Enum):
    """9大核心意图类型"""
    CREATE_CARD = "create_card"           # 创建知识卡片
    SEARCH_CARDS = "search_cards"          # 搜索知识卡片
    ORGANIZE_CARDS = "organize_cards"     # 组织知识结构
    ANALYZE_DOCUMENT = "analyze_document"  # 文档智能分析
    GENERATE_PPT = "generate_ppt"          # 自动生成演示文稿
    MANAGE_TASKS = "manage_tasks"         # 任务与项目管理
    ANALYZE_IMAGE = "analyze_image"       # 图像内容分析
    CHECK_PERFORMANCE = "check_performance"  # 系统状态监控
    COMPLEX_WORKFLOW = "complex_workflow"    # 复杂工作流执行
    GENERAL_CHAT = "general_chat"          # 通用聊天
    GREETING = "greeting"                  # 问候
    HELP = "help"                          # 帮助


@dataclass
class EntityExtraction:
    """实体提取结果"""
    topics: List[str] = field(default_factory=list)      # 主题/关键词
    colors: List[str] = field(default_factory=list)      # 卡片颜色（蓝/绿/黄/红）
    time_range: Optional[Dict[str, str]] = None           # 时间范围
    filters: Dict[str, Any] = field(default_factory=dict) # 过滤条件
    numbers: List[int] = field(default_factory=list)      # 数字
    file_types: List[str] = field(default_factory=list)   # 文件类型
    people: List[str] = field(default_factory=list)       # 人员


@dataclass
class IntentResult:
    """意图识别结果"""
    primary_intent: IntentType
    confidence: float = 0.0
    alternative_intents: List[IntentType] = field(default_factory=list)
    entities: EntityExtraction = field(default_factory=EntityExtraction)
    sub_intents: List['IntentResult'] = field(default_factory=list)  # 组合意图
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


# ============ 意图模式库（正则快速匹配）============

INTENT_PATTERNS: Dict[IntentType, List[str]] = {
    IntentType.CREATE_CARD: [
        r"(?:创建|新建|添加|写|记录|保存|记下).*(?:卡片|知识卡|事实|解释|风险|行动|笔记|便签)",
        r"(?:把|将).*(?:做成|转为|变成|整理成|总结成).*(?:卡片|知识卡)",
        r"(?:给我|帮我|请).*(?:记录|记下|写|创建|建).*(?:卡片|知识|笔记)",
        r"(?:整理|梳理|归纳).*(?:成|为).*(?:卡片|知识卡片)",
        r"(?:做一个|建一个|写一张).*(?:蓝卡|绿卡|黄卡|红卡|卡片)",
        r"(?:记录|记)(?:一下|下).*(?:这个|这些|以下)",
    ],
    IntentType.SEARCH_CARDS: [
        r"(?:查|搜|找|检索|搜索|查询|看看|看看有没有).*(?:卡片|知识|内容|资料|信息|文件|文档)",
        r"(?:有什么|有哪些|有没有|还有没有).*(?:卡片|知识|资料|信息)",
        r"(?:显示|列出|给我看|展示).*(?:卡片|知识|内容|结果)",
        r"(?:卡片|知识库|数据库).*(?:查询|搜索|检索|查找)",
        r"(?:帮我|帮我查|帮我找|给我找).*(?:关于|和|跟).*(?:的|相关).*(?:卡片|知识|资料|信息)",
    ],
    IntentType.ORGANIZE_CARDS: [
        r"(?:建立|创建|新建|构建|打造).*(?:专题|分组|分类|关系|关联|知识图谱|知识网络)",
        r"(?:组织|整理|归纳|梳理|连接).*(?:知识|卡片|内容|结构)",
        r"(?:图谱|关系|可视化|关系图|网络图).*(?:显示|展示|查看|创建|构建)",
        r"(?:连接|关联|链接|串联).*(?:卡片|知识|内容|信息|节点)",
        r"(?:这些|这几个).*(?:之间|相互).*(?:关系|关联|联系)",
    ],
    IntentType.ANALYZE_DOCUMENT: [
        r"(?:分析|解析|处理|读取|看看).*(?:文档|文件|PDF|Word|Excel|PPT|报告|FMEA|材料|文章|论文)",
        r"(?:文档|文件|PDF|Word|Excel).*(?:分析|解析|处理|读取|提取|帮我看看)",
        r"(?:提取|总结|归纳|概括).*(?:文档|文件|PDF|报告|文章).*(?:内容|要点|关键|信息|数据)",
        r"(?:上传|导入).*(?:文档|文件|PDF).*(?:分析|处理|解析)",
        r"(?:这份|这个|这篇).*(?:文档|文件|报告|文章).*(?:分析|看看|处理).*",
    ],
    IntentType.GENERATE_PPT: [
        r"(?:生成|制作|创建|做|写|弄).*(?:PPT|演示|幻灯片|演示文稿|汇报材料)",
        r"(?:PPT|演示|幻灯片|演示文稿).*(?:生成|制作|创建|弄)",
        r"(?:汇报|展示|演示|报告).*(?:PPT|幻灯片|文稿|材料)",
        r"(?:报告|周报|月报|年报|总结|复盘).*(?:生成|创建|做).*(?:PPT|演示|报告)",
        r"(?:基于|根据).*(?:卡片|内容|结果).*(?:生成|制作).*(?:PPT|演示)",
    ],
    IntentType.MANAGE_TASKS: [
        r"(?:创建|添加|新建|设置|加).*(?:任务|待办|提醒|项目|事项|TODO)",
        r"(?:任务|待办|项目|GTD).*(?:管理|查看|分配|跟踪|整理)",
        r"(?:我的|今天的|本周的|这周的).*(?:任务|待办|计划|工作|安排)",
        r"(?:提醒|通知).*(?:任务|待办|截止|到期)",
        r"(?:分配|指派).*(?:任务|工作|事项).*(?:给|到)",
    ],
    IntentType.ANALYZE_IMAGE: [
        r"(?:分析|解析|识别|查看|看|看看).*(?:图片|图像|照片|截图|图|画面)",
        r"(?:这张|这个|上面|下面)(?:图|图片|照片|截图).*",
        r"(?:图片|图像|照片).*(?:内容|分析|识别|解析|里面|上)",
        r"(?:图里|图中|图片里|图上|照片里).*(?:有|是|什么)",
        r"(?:上传|发).*(?:照片|图片|图|截图).*",
    ],
    IntentType.CHECK_PERFORMANCE: [
        r"(?:系统|性能|NPU|CPU|内存|存储|硬盘|速度).*(?:怎么|如何|怎样|状况|状态|检查|监控|显示|告诉我)",
        r"(?:检查|查看|监控|测).*(?:系统|性能|NPU|资源|空间|速度)",
        r"(?:可用|剩余|还有多少).*(?:空间|内存|资源|存储)",
        r"(?:性能|速度|效率|NPU|算力).*(?:如何|怎么样|怎样|多少)",
        r"(?:系统|机器|电脑).*(?:状态|情况|怎么样)",
    ],
    IntentType.COMPLEX_WORKFLOW: [
        r"(?:启动|执行|运行|开始|走|跑).*(?:流程|工作流|分析流程|报告流程|完整流程)",
        r"(?:完整的|全流程|端到端|自动化|自动).*(?:分析|报告|生成|处理|评估)",
        r"(?:帮我|给我|为).*(?:从头|完整|系统|全面).*(?:分析|处理|整理|评估)",
        r"(?:全面|系统|深度).*(?:分析|评估|整理|审查|诊断)",
        r"(?:演示|展示|介绍|说明).*(?:工作流|流程|功能|使用)",
        r"(?:工作流|工作流程).*(?:演示|怎么用|如何使用|使用流程|介绍)",
        r"(?:文献综述|项目复盘|竞品分析|会议纪要|周报生成|风险评估).*",
        r"(?:做一个|帮我做|给我做).*(?:文献综述|项目复盘|竞品分析|风险评估|会议纪要|周报)",
        r"(?:帮我|给我).*(?:梳理|整合|综合).*(?:分析|报告|文档|方案)",
    ],
    IntentType.GREETING: [
        r"^(?:你好|您好|嗨|Hi|Hello|早上好|下午好|晚上好|早|好|哈喽)",
        r"(?:在吗|在嘛|在不在|来了|我来了|在线不)",
    ],
    IntentType.HELP: [
        r"(?:帮助|怎么用|功能|能做什么|有什么功能|如何使用|说明|教程|使用指南|文档|介绍)",
        r"(?:你能|你可以|你会).*(?:做什么|干什么|帮我做什么)",
    ],
}


# ============ 实体提取正则模式 ============

ENTITY_PATTERNS = {
    "color_blue": [
        r"(?:蓝色|蓝卡|事实).*(?:卡片|卡)",
        r"(?:创建|写)(?:一张|个).*(?:蓝|事实).*(?:卡片|卡)",
        r"(?:蓝卡|事实卡)",
    ],
    "color_green": [
        r"(?:绿色|绿卡|解释).*(?:卡片|卡)",
        r"(?:创建|写)(?:一张|个).*(?:绿|解释).*(?:卡片|卡)",
        r"(?:绿卡|解释卡)",
    ],
    "color_yellow": [
        r"(?:黄色|黄卡|风险).*(?:卡片|卡)",
        r"(?:创建|写)(?:一张|个).*(?:黄|风险).*(?:卡片|卡)",
        r"(?:黄卡|风险卡)",
    ],
    "color_red": [
        r"(?:红色|红卡|行动|措施).*(?:卡片|卡)",
        r"(?:创建|写)(?:一张|个).*(?:红|行动).*(?:卡片|卡)",
        r"(?:红卡|行动卡|措施卡)",
    ],
    "time_range": [
        r"(?:最近|过去|上)(\d+)(?:个|天|周|月|年)",
        r"(?:今天|昨天|明天|本周|上周|下周|本月|上月|下月|今年|去年|明年)",
        r"(\d{4})年(\d{1,2})月(?:\d{1,2}日)?",
    ],
    "file_type": [
        r"(PDF|Word|Excel|PPT|FMEA|报告|文档|表格)",
        r"\.(pdf|docx?|xlsx?|pptx?|csv|txt)",
    ],
    "people": [
        r"(?:分配给|交给|派给|让)(.+?)(?:处理|负责|来做)",
        r"@(\w+)",
    ],
}


def extract_entities(query: str) -> EntityExtraction:
    """提取实体信息"""
    entities = EntityExtraction()
    query_lower = query.lower()
    
    # 提取颜色
    color_map = {
        "color_blue": "蓝",
        "color_green": "绿",
        "color_yellow": "黄",
        "color_red": "红",
    }
    for pattern_key, patterns in ENTITY_PATTERNS.items():
        if pattern_key.startswith("color_"):
            for p in patterns:
                if re.search(p, query, re.IGNORECASE):
                    color = color_map[pattern_key]
                    if color not in entities.colors:
                        entities.colors.append(color)
    
    # 提取时间
    for pattern in ENTITY_PATTERNS["time_range"]:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            entities.time_range = {"raw": match.group(0), "matched": match.group()}
            break
    
    # 提取文件类型
    for pattern in ENTITY_PATTERNS["file_type"]:
        for m in re.finditer(pattern, query, re.IGNORECASE):
            ft = m.group().upper() if m.group().isalpha() else m.group()
            if ft not in entities.file_types:
                entities.file_types.append(ft)
    
    # 提取人员
    for pattern in ENTITY_PATTERNS["people"]:
        for m in re.finditer(pattern, query, re.IGNORECASE):
            person = m.group(1).strip()
            if person and person not in entities.people:
                entities.people.append(person)
    
    # 提取数字
    entities.numbers = [int(n) for n in re.findall(r'\d+', query)][:3]
    
    # 提取过滤条件
    if "高风险" in query or "风险高" in query or "严重" in query:
        entities.filters["risk_level"] = "high"
    if "中等" in query:
        entities.filters["risk_level"] = "medium"
    if "低风险" in query or "风险低" in query:
        entities.filters["risk_level"] = "low"
    
    # 提取主题关键词
    topic_indicators = ["关于", "有关", "对于", "针对", "基于"]
    for indicator in topic_indicators:
        idx = query.find(indicator)
        if idx >= 0:
            remaining = query[idx + len(indicator):].strip()
            topic_endings = ["的", "之", "（", "(", "，", ",", "。", "."]
            for end in topic_endings:
                end_idx = remaining.find(end)
                if end_idx > 0:
                    topic = remaining[:end_idx].strip()
                    if topic and len(topic) <= 20:
                        entities.topics.append(topic)
                        break
    
    return entities


def recognize_intent_regex(query: str) -> Optional[IntentResult]:
    """正则表达式快速意图识别（全覆盖，无需LLM）"""
    best_intent = None
    best_confidence = 0.0
    
    for intent_type, patterns in INTENT_PATTERNS.items():
        match_count = 0
        for pattern in patterns:
            if re.search(pattern, query, re.IGNORECASE):
                match_count += 1
        
        if match_count > 0:
            # 匹配越多模式，置信度越高（0.35 ~ 1.0）
            confidence = (0.35 + (match_count / max(len(patterns), 1)) * 0.65)
            if confidence > best_confidence:
                best_confidence = confidence
                best_intent = intent_type
    
    if best_intent is not None:
        entities = extract_entities(query)
        return IntentResult(
            primary_intent=best_intent,
            confidence=best_confidence,
            entities=entities
        )
    
    return None


async def recognize_intent_llm(query: str, call_llm_func) -> Optional[IntentResult]:
    """使用LLM进行语义意图识别"""
    intent_list = "\n".join([f"- {i.value}: {i.name}" for i in IntentType])
    
    prompt = f"""请分析用户查询的意图，判断属于以下哪种类型（只返回意图类型名称，多个用逗号分隔）：

{intent_list}

【重要规则】：
1. 如果提到"卡片"、"四色"、"蓝卡/绿卡/黄卡/红卡"，且是要新增/写/建 → CREATE_CARD
2. 如果是查找/搜索现有卡片 → SEARCH_CARDS  
3. 如果涉及知识图谱、建立关联、组织专题 → ORGANIZE_CARDS
4. 如果是分析/解析PDF/Word文档 → ANALYZE_DOCUMENT
5. 如果是生成PPT/演示文稿 → GENERATE_PPT
6. 如果是任务/待办/项目管理 → MANAGE_TASKS
7. 如果是分析图片/图像 → ANALYZE_IMAGE
8. 如果是检查系统/NPU/性能 → CHECK_PERFORMANCE
9. 如果涉及复杂多步骤工作流 → COMPLEX_WORKFLOW
10. 问候 → GREETING
11. 询问功能/帮助 → HELP
12. 其他 → GENERAL_CHAT

用户查询：{query[:300]}

只返回意图类型（如 CREATE_CARD 或 SEARCH_CARDS,GENERATE_PPT 表示组合意图），不要其他内容。"""
    
    try:
        result = await call_llm_func("你是意图识别助手。", prompt)
        if result:
            result = result.strip().upper()
            intents = []
            for part in result.split(","):
                part = part.strip()
                for intent_type in IntentType:
                    if part == intent_type.value.upper() or part == intent_type.name:
                        intents.append(intent_type)
                        break
            
            if intents:
                entities = extract_entities(query)
                if len(intents) > 1:
                    return IntentResult(
                        primary_intent=intents[0],
                        confidence=0.75,
                        alternative_intents=intents[1:3],
                        entities=entities,
                        sub_intents=[
                            IntentResult(primary_intent=i, confidence=0.6, entities=entities)
                            for i in intents[1:]
                        ]
                    )
                return IntentResult(
                    primary_intent=intents[0],
                    confidence=0.75,
                    entities=entities
                )
    except Exception as e:
        logger.warning(f"[Intent] LLM识别失败: {e}")
    
    return None


async def recognize_intent(
    query: str, 
    call_llm_func=None,
    use_llm: bool = False  # 默认不调LLM，正则已覆盖99%场景
) -> IntentResult:
    """
    混合意图识别：正则优先 → 兜底LLM
    策略：正则匹配到任何意图（≥0.35）直接返回，不调用LLM
         只有正则完全未命中时才走LLM（且需 use_llm=True）
    """
    # 第一层：正则快速匹配（覆盖99%场景）
    regex_result = recognize_intent_regex(query)
    
    if regex_result and regex_result.confidence >= 0.35:
        logger.info(
            f"[Intent] 正则识别: {regex_result.primary_intent.value} "
            f"(confidence={regex_result.confidence:.2f}, 无需LLM)"
        )
        return regex_result
    
    # 第二层：正则弱匹配（极少数模糊查询），仍然优先返回
    if regex_result:
        logger.info(
            f"[Intent] 正则弱匹配: {regex_result.primary_intent.value} "
            f"(confidence={regex_result.confidence:.2f})"
        )
        return regex_result
    
    # 第三层：LLM 兜底（仅当正则完全命中0个模式时）
    if use_llm and call_llm_func:
        llm_result = await recognize_intent_llm(query, call_llm_func)
        if llm_result:
            logger.info(
                f"[Intent] LLM兜底识别: {llm_result.primary_intent.value} "
                f"(confidence={llm_result.confidence:.2f})"
            )
            return llm_result
    
    # 最终兜底：通用聊天
    return IntentResult(
        primary_intent=IntentType.GENERAL_CHAT,
        confidence=0.3,
        entities=extract_entities(query)
    )


def get_intent_display_name(intent_type: IntentType) -> str:
    """获取意图的显示名称"""
    names = {
        IntentType.CREATE_CARD: "创建知识卡片",
        IntentType.SEARCH_CARDS: "搜索知识卡片",
        IntentType.ORGANIZE_CARDS: "组织知识结构",
        IntentType.ANALYZE_DOCUMENT: "文档智能分析",
        IntentType.GENERATE_PPT: "自动生成PPT",
        IntentType.MANAGE_TASKS: "任务与项目管理",
        IntentType.ANALYZE_IMAGE: "图像内容分析",
        IntentType.CHECK_PERFORMANCE: "系统状态监控",
        IntentType.COMPLEX_WORKFLOW: "复杂工作流执行",
        IntentType.GENERAL_CHAT: "通用对话",
        IntentType.GREETING: "问候",
        IntentType.HELP: "帮助信息",
    }
    return names.get(intent_type, intent_type.value)


def get_intent_emoji(intent_type: IntentType) -> str:
    """获取意图的表情符号"""
    emojis = {
        IntentType.CREATE_CARD: "📝",
        IntentType.SEARCH_CARDS: "🔍",
        IntentType.ORGANIZE_CARDS: "🔗",
        IntentType.ANALYZE_DOCUMENT: "📄",
        IntentType.GENERATE_PPT: "📊",
        IntentType.MANAGE_TASKS: "✅",
        IntentType.ANALYZE_IMAGE: "🖼️",
        IntentType.CHECK_PERFORMANCE: "💻",
        IntentType.COMPLEX_WORKFLOW: "🔄",
        IntentType.GENERAL_CHAT: "💬",
        IntentType.GREETING: "👋",
        IntentType.HELP: "❓",
    }
    return emojis.get(intent_type, "💬")
