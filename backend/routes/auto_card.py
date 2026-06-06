#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动创建知识卡片模块

主路径：调用 4 个 Agent（通政司/监察院/刑狱司/参谋司）经 NPU/LLM 推理
        提取四色卡片（🔵事实 / 🟢解释 / 🟡风险 / 🔴行动）
降级兜底：保留原有纯规则提取（关键词正则），Agent 不可用/超时/解析失败时自动切换

环境变量：
    AUTO_CARD_LLM       = 1（默认，开）/ 0（关闭，仅用规则）
    AUTO_CARD_LLM_TIMEOUT = 8.0（默认，秒，LLM 主路径总超时）
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import asyncio
import logging
import os
import re
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

db_manager = None

# LLM 路径单 Agent 超时（秒）；总编排用 gather，2 阶段串行
LLM_TIMEOUT_SEC: float = float(os.environ.get("AUTO_CARD_LLM_TIMEOUT", "8"))
LLM_DISABLED: bool = os.environ.get("AUTO_CARD_LLM", "1") == "0"

# 懒加载的 Agent 缓存
_AGENTS: Optional[Dict[str, Any]] = None
_AGENT_IMPORT_ERROR: Optional[Exception] = None


@dataclass
class CardSuggestion:
    """卡片建议"""
    title: str
    content: str
    card_type: str  # blue/green/yellow/red
    confidence: float
    source: str  # 来源描述


def set_db_manager(manager):
    """设置数据库管理器"""
    global db_manager
    db_manager = manager
    logger.info("[AutoCard] 数据库管理器已设置")


# ===================== Agent 懒加载 =====================

def _get_agents() -> Optional[Dict[str, Any]]:
    """
    懒加载 4 个 Agent；任何导入失败返回 None（自动回退到规则）
    Agent 的 genie_api_base_url/model_path 实际未使用（共用 shared_genie_client），
    这里传空字符串占位。
    """
    global _AGENTS, _AGENT_IMPORT_ERROR
    if _AGENTS is not None:
        return _AGENTS
    if _AGENT_IMPORT_ERROR is not None:
        return None
    if LLM_DISABLED:
        _AGENT_IMPORT_ERROR = RuntimeError("LLM path disabled by env AUTO_CARD_LLM=0")
        return None
    try:
        from agents.fact_generator import FactGeneratorAgent
        from agents.interpreter import InterpreterAgent
        from agents.risk_detector import RiskDetectorAgent
        from agents.action_advisor import ActionAdvisorAgent
        _AGENTS = {
            "fact": FactGeneratorAgent("", ""),
            "interp": InterpreterAgent("", ""),
            "risk": RiskDetectorAgent("", ""),
            "action": ActionAdvisorAgent("", ""),
        }
        logger.info("[AutoCard] 4-Agent 加载成功（通政司/监察院/刑狱司/参谋司）")
        return _AGENTS
    except Exception as e:
        _AGENT_IMPORT_ERROR = e
        logger.warning(f"[AutoCard] Agent 加载失败，回退规则路径: {e}")
        return None


def _build_preprocessed_data(text: str) -> Dict[str, Any]:
    """把纯文本包装成 Agent 期望的 preprocessed_data 结构"""
    return {
        "preprocessed_data": {
            "data": [{"text": text}],
            "schema": {"text": "string"},
            "features": {},
        },
        "quality_report": {
            "completeness": 1.0,
            "accuracy": 1.0,
            "cleaning_ratio": 1.0,
        },
    }


# ===================== Agent 输出 → CardSuggestion 转换 =====================

def _fact_to_suggestion(fact: Dict[str, Any]) -> Optional[CardSuggestion]:
    if not isinstance(fact, dict):
        return None
    title = (fact.get("title") or "").strip()
    desc = (fact.get("description") or "").strip()
    content = desc or title
    if not (5 <= len(content) <= 300):
        return None
    try:
        conf = float(fact.get("confidence", 0.8))
    except (TypeError, ValueError):
        conf = 0.8
    return CardSuggestion(
        title=(title or content)[:30],
        content=content,
        card_type="blue",
        confidence=max(0.5, min(conf, 0.99)),
        source="LLM推理（通政司）",
    )


def _explanation_to_suggestion(exp: Dict[str, Any]) -> Optional[CardSuggestion]:
    if not isinstance(exp, dict):
        return None
    text = (exp.get("explanation") or "").strip()
    if not (10 <= len(text) <= 300):
        return None
    try:
        conf = float(exp.get("confidence", 0.7))
    except (TypeError, ValueError):
        conf = 0.7
    return CardSuggestion(
        title=f"解释: {text[:25]}",
        content=text,
        card_type="green",
        confidence=max(0.5, min(conf, 0.99)),
        source="LLM推理（监察院）",
    )


def _risk_to_suggestion(risk: Dict[str, Any]) -> Optional[CardSuggestion]:
    if not isinstance(risk, dict):
        return None
    name = (risk.get("name") or "").strip()
    desc = (risk.get("description") or "").strip()
    text = desc or name
    if not (8 <= len(text) <= 280):
        return None
    severity = (risk.get("severity") or "medium").lower()
    conf = {"high": 0.9, "medium": 0.75, "low": 0.6}.get(severity, 0.7)
    return CardSuggestion(
        title=f"风险: {name[:25]}" if name else f"风险提示: {text[:25]}",
        content=text,
        card_type="yellow",
        confidence=conf,
        source="LLM推理（刑狱司）",
    )


def _action_to_suggestion(action: Dict[str, Any]) -> Optional[CardSuggestion]:
    if not isinstance(action, dict):
        return None
    title = (action.get("title") or "").strip()
    goal = (action.get("goal") or "").strip()
    steps = action.get("steps") or []
    parts: List[str] = []
    if goal:
        parts.append(f"目标: {goal}")
    if isinstance(steps, list) and steps:
        parts.append("步骤: " + "; ".join(str(s) for s in steps[:5]))
    text = "\n".join(parts) if parts else title
    if not (8 <= len(text) <= 300):
        return None
    prio = (action.get("urgency") or action.get("priority") or "medium").lower()
    conf = {"high": 0.9, "medium": 0.75, "low": 0.6}.get(prio, 0.7)
    return CardSuggestion(
        title=f"行动: {title[:25]}" if title else f"行动项: {text[:25]}",
        content=text,
        card_type="red",
        confidence=conf,
        source="LLM推理（参谋司）",
    )


# ===================== 纯规则提取（降级兜底，保持原行为） =====================

def extract_facts_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取事实类信息（规则版）"""
    suggestions: List[CardSuggestion] = []
    patterns = [
        r'([^。！？]+?)是([^。！？]+?)[。！？]',
        r'([^。！？]+?)有([^。！？]+?)[。！？]',
        r'(\d+)[^。！？]*?增长[^。！？]*?([\d.]+%)',
        r'成本[为是]?([^。！？]+)',
        r'营收[为是]?([^。！？]+)',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            content = match.group(0).strip()
            if 5 <= len(content) <= 200:
                suggestions.append(CardSuggestion(
                    title=content[:30],
                    content=content,
                    card_type="blue",
                    confidence=0.7,
                    source="规则提取（降级兜底）",
                ))
    return suggestions


def extract_risks_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取风险类信息（规则版）"""
    suggestions: List[CardSuggestion] = []
    risk_keywords = ['风险', '问题', '隐患', '注意', '警惕', '谨慎', '避免', '小心']
    for sentence in re.split(r'[。！？]', text):
        if any(kw in sentence for kw in risk_keywords) and len(sentence) >= 10:
            suggestions.append(CardSuggestion(
                title=f"风险提示: {sentence[:25]}",
                content=sentence.strip(),
                card_type="yellow",
                confidence=0.6,
                source="规则提取（降级兜底）",
            ))
    return suggestions


def extract_actions_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取行动建议（规则版）"""
    suggestions: List[CardSuggestion] = []
    action_patterns = [
        r'(\d+)[.、]([^。]+)',
        r'(建议|应该|需要)([^。]+)',
    ]
    for pattern in action_patterns:
        for match in re.finditer(pattern, text):
            content = match.group(0).strip()
            if len(content) >= 5:
                suggestions.append(CardSuggestion(
                    title=f"行动项: {content[:25]}",
                    content=content,
                    card_type="red",
                    confidence=0.7,
                    source="规则提取（降级兜底）",
                ))
    return suggestions


def extract_explanations_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取解释类信息（规则版）"""
    suggestions: List[CardSuggestion] = []
    explain_keywords = ['因为', '由于', '原因是', '这是因为', '意味着', '说明']
    for sentence in re.split(r'[。！？]', text):
        if any(kw in sentence for kw in explain_keywords) and len(sentence) >= 10:
            suggestions.append(CardSuggestion(
                title=f"解释: {sentence[:25]}",
                content=sentence.strip(),
                card_type="green",
                confidence=0.5,
                source="规则提取（降级兜底）",
            ))
    return suggestions


def _analyze_rule_only(
    user_query: str,
    assistant_response: str,
    threshold: float = 0.5,
) -> List[CardSuggestion]:
    """仅走规则路径的同步实现（被同步/异步入口共用）"""
    suggestions: List[CardSuggestion] = []
    suggestions.extend(extract_facts_from_text(user_query))
    suggestions.extend(extract_risks_from_text(user_query))
    suggestions.extend(extract_actions_from_text(user_query))
    suggestions.extend(extract_facts_from_text(assistant_response))
    suggestions.extend(extract_risks_from_text(assistant_response))
    suggestions.extend(extract_actions_from_text(assistant_response))
    suggestions.extend(extract_explanations_from_text(assistant_response))
    return _dedupe_and_filter(suggestions, threshold)


def _dedupe_and_filter(
    suggestions: List[CardSuggestion],
    threshold: float,
) -> List[CardSuggestion]:
    """按 title 前缀去重并按阈值过滤，最多返回 5 条"""
    seen: set = set()
    filtered: List[CardSuggestion] = []
    for s in suggestions:
        key = s.title[:20]
        if key in seen or s.confidence < threshold:
            continue
        seen.add(key)
        filtered.append(s)
    return filtered[:5]


# ===================== LLM 主路径（异步编排） =====================

async def _safe_call(coro, default: Any = None) -> Any:
    """带超时的安全 await，异常时返回 default"""
    try:
        return await asyncio.wait_for(coro, timeout=LLM_TIMEOUT_SEC)
    except asyncio.TimeoutError:
        logger.warning(f"[AutoCard] Agent 任务超时 {LLM_TIMEOUT_SEC}s")
        return default
    except Exception as e:
        logger.warning(f"[AutoCard] Agent 任务异常: {e}")
        return default


async def analyze_and_suggest_cards_async(
    user_query: str,
    assistant_response: str,
    threshold: float = 0.5,
) -> List[CardSuggestion]:
    """
    主路径：4-Agent 协同提取四色卡片
    - 阶段1 并行：通政司(事实) + 刑狱司(风险)
    - 阶段2 串行：监察院(解释) 依赖事实 / 参谋司(行动) 依赖前两者
    - 任一 Agent 失败/超时不影响其他类型；4 类全空时回退到规则
    """
    text = f"{(user_query or '').strip()}\n{(assistant_response or '').strip()}".strip()
    if not text:
        return []

    agents = _get_agents()
    if agents is None:
        return _analyze_rule_only(user_query, assistant_response, threshold)

    current_date = datetime.now().strftime("%Y-%m-%d")
    ppd = _build_preprocessed_data(text)

    # 阶段 1：事实 + 风险 并行
    facts_task = _safe_call(agents["fact"].generate_facts(ppd, text, current_date), default={})
    risk_task = _safe_call(agents["risk"].detect_risks(ppd, {}, text), default={})
    facts_result, risk_result = await asyncio.gather(facts_task, risk_task)

    facts_dict: Dict[str, List[Any]] = (
        facts_result.get("facts", {}) if isinstance(facts_result, dict) else {}
    )
    risks_dict: Dict[str, List[Any]] = (
        risk_result.get("risks", {}) if isinstance(risk_result, dict) else {}
    )

    # 阶段 2：解释 + 行动 串行（依赖前阶段）
    explanations_dict: Dict[str, List[Any]] = {}
    actions_dict: Dict[str, List[Any]] = {}
    if facts_dict:
        exp_result = await _safe_call(
            agents["interp"].generate_explanations(facts_dict, text, current_date),
            default={},
        )
        if isinstance(exp_result, dict):
            explanations_dict = exp_result.get("explanations") or {}
    if facts_dict or risks_dict:
        action_result = await _safe_call(
            agents["action"].generate_actions(
                facts_dict, explanations_dict, risks_dict, text
            ),
            default={},
        )
        if isinstance(action_result, dict):
            actions_dict = action_result.get("actions") or {}

    # 聚合
    suggestions: List[CardSuggestion] = []

    for items in facts_dict.values():
        if not isinstance(items, list):
            continue
        for f in items:
            s = _fact_to_suggestion(f)
            if s:
                suggestions.append(s)

    for items in explanations_dict.values():
        if not isinstance(items, list):
            continue
        for e in items:
            s = _explanation_to_suggestion(e)
            if s:
                suggestions.append(s)

    for items in risks_dict.values():
        if not isinstance(items, list):
            continue
        for r in items:
            s = _risk_to_suggestion(r)
            if s:
                suggestions.append(s)

    for items in actions_dict.values():
        if not isinstance(items, list):
            continue
        for a in items:
            s = _action_to_suggestion(a)
            if s:
                suggestions.append(s)

    logger.info(
        f"[AutoCard] LLM 提取: 事实{len(facts_dict)}类 解释{len(explanations_dict)}类 "
        f"风险{len(risks_dict)}类 行动{len(actions_dict)}类 → {len(suggestions)}张候选卡"
    )

    if not suggestions:
        logger.info("[AutoCard] LLM 路径无结果，回退规则")
        return _analyze_rule_only(user_query, assistant_response, threshold)

    return _dedupe_and_filter(suggestions, threshold)


# ===================== 同步入口（兼容旧调用方） =====================

def _can_run_async() -> bool:
    """检测当前线程是否处于可独立运行 asyncio.run 的状态"""
    if LLM_DISABLED:
        return False
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return False
    except RuntimeError:
        pass
    return True


def analyze_and_suggest_cards(
    user_query: str,
    assistant_response: str,
    threshold: float = 0.5,
) -> List[CardSuggestion]:
    """
    分析对话，提取可能需要创建为知识卡片的内容
    - 同步上下文：尝试 asyncio.run 走 LLM 主路径，失败/在事件循环中则走规则
    - 异步上下文：请直接调用 analyze_and_suggest_cards_async
    """
    if not _can_run_async():
        return _analyze_rule_only(user_query, assistant_response, threshold)
    try:
        return asyncio.run(
            analyze_and_suggest_cards_async(user_query, assistant_response, threshold)
        )
    except Exception as e:
        logger.warning(f"[AutoCard] 异步编排失败，回退规则: {e}")
        return _analyze_rule_only(user_query, assistant_response, threshold)


# ===================== 卡片创建 =====================

def create_card_from_suggestion(suggestion: CardSuggestion) -> Optional[str]:
    """根据建议创建知识卡片"""
    global db_manager
    if db_manager is None:
        logger.error("数据库管理器未初始化")
        return None
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        card_id = str(uuid.uuid4())[:8]
        category_map = {
            "blue": "事实",
            "green": "解释",
            "yellow": "风险",
            "red": "行动",
        }
        cursor.execute(
            """
            INSERT INTO knowledge_cards
            (id, title, content, type, category, similarity, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            [
                card_id,
                suggestion.title,
                suggestion.content,
                suggestion.card_type,
                category_map.get(suggestion.card_type, "事实"),
                suggestion.confidence,
            ],
        )
        conn.commit()
        conn.close()
        logger.info(f"[AutoCard] 创建卡片: {card_id} - {suggestion.title} ({suggestion.source})")
        return card_id
    except Exception as e:
        logger.error(f"创建卡片失败: {e}")
        return None


def auto_create_cards(
    user_query: str,
    assistant_response: str,
    auto_threshold: float = 0.7,
) -> Dict[str, Any]:
    """
    自动创建知识卡片
    只自动创建高置信度的建议
    """
    suggestions = analyze_and_suggest_cards(user_query, assistant_response)
    created = []
    for suggestion in suggestions:
        if suggestion.confidence >= auto_threshold:
            card_id = create_card_from_suggestion(suggestion)
            if card_id:
                created.append({
                    "card_id": card_id,
                    "title": suggestion.title,
                    "type": suggestion.card_type,
                    "confidence": suggestion.confidence,
                    "source": suggestion.source,
                })
    return {
        "suggestions_count": len(suggestions),
        "auto_created_count": len(created),
        "created_cards": created,
        "all_suggestions": [
            {
                "title": s.title,
                "type": s.card_type,
                "confidence": s.confidence,
                "source": s.source,
            }
            for s in suggestions
        ],
    }


def suggest_cards_api(
    user_query: str,
    assistant_response: str,
) -> Dict[str, Any]:
    """
    卡片建议 API
    只返回建议，不自动创建
    """
    suggestions = analyze_and_suggest_cards(user_query, assistant_response, threshold=0.3)
    return {
        "count": len(suggestions),
        "suggestions": [
            {
                "title": s.title,
                "content": s.content,
                "type": s.card_type,
                "confidence": s.confidence,
                "source": s.source,
                "reason": _get_type_reason(s.card_type),
            }
            for s in suggestions
        ],
    }


async def suggest_cards_api_async(
    user_query: str,
    assistant_response: str,
) -> Dict[str, Any]:
    """卡片建议 API（异步版本，供 async def 路由直接 await）"""
    suggestions = await analyze_and_suggest_cards_async(
        user_query, assistant_response, threshold=0.3
    )
    return {
        "count": len(suggestions),
        "suggestions": [
            {
                "title": s.title,
                "content": s.content,
                "type": s.card_type,
                "confidence": s.confidence,
                "source": s.source,
                "reason": _get_type_reason(s.card_type),
            }
            for s in suggestions
        ],
    }


def _get_type_reason(card_type: str) -> str:
    """获取类型建议的原因"""
    reasons = {
        "blue": "包含明确的事实或数据",
        "green": "包含原因或解释",
        "yellow": "包含风险或注意事项",
        "red": "包含行动建议或任务",
    }
    return reasons.get(card_type, "一般信息")
