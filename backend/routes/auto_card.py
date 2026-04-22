#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动创建知识卡片模块
从对话中提取信息，自动创建知识卡片
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging
import re
import uuid

logger = logging.getLogger(__name__)

db_manager = None


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


def extract_facts_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取事实类信息"""
    suggestions = []
    
    # 匹配明确的陈述句
    patterns = [
        r'([^。！？]+?)是([^。！？]+?)[。！？]',
        r'([^。！？]+?)有([^。！？]+?)[。！？]',
        r'(\d+)[^。！？]*?增长[^。！？]*?([\d.]+%)',
        r'成本[为是]?([^。！？]+)',
        r'营收[为是]?([^。！？]+)',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            content = match.group(0).strip()
            if len(content) >= 5 and len(content) <= 200:
                suggestions.append(CardSuggestion(
                    title=content[:30],
                    content=content,
                    card_type="blue",
                    confidence=0.7,
                    source="对话提取"
                ))
    
    return suggestions


def extract_risks_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取风险类信息"""
    suggestions = []
    
    risk_keywords = ['风险', '问题', '隐患', '注意', '警惕', '谨慎', '避免', '小心']
    
    sentences = re.split(r'[。！？]', text)
    for sentence in sentences:
        if any(kw in sentence for kw in risk_keywords) and len(sentence) >= 10:
            suggestions.append(CardSuggestion(
                title=f"风险提示: {sentence[:25]}",
                content=sentence.strip(),
                card_type="yellow",
                confidence=0.6,
                source="对话提取"
            ))
    
    return suggestions


def extract_actions_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取行动建议"""
    suggestions = []
    
    action_keywords = ['建议', '应该', '需要', '可以', '要', '必须', '请', '推荐']
    action_patterns = [
        r'(\d+)[.、]([^。]+)',
        r'(建议|应该|需要)([^。]+)',
    ]
    
    # 匹配编号的行动项
    for pattern in action_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            content = match.group(0).strip()
            if len(content) >= 5:
                suggestions.append(CardSuggestion(
                    title=f"行动项: {content[:25]}",
                    content=content,
                    card_type="red",
                    confidence=0.7,
                    source="对话提取"
                ))
    
    return suggestions


def extract_explanations_from_text(text: str) -> List[CardSuggestion]:
    """从文本中提取解释类信息"""
    suggestions = []
    
    explain_keywords = ['因为', '由于', '原因是', '这是因为', '意味着', '说明']
    
    sentences = re.split(r'[。！？]', text)
    for sentence in sentences:
        if any(kw in sentence for kw in explain_keywords) and len(sentence) >= 10:
            suggestions.append(CardSuggestion(
                title=f"解释: {sentence[:25]}",
                content=sentence.strip(),
                card_type="green",
                confidence=0.5,
                source="对话提取"
            ))
    
    return suggestions


def analyze_and_suggest_cards(
    user_query: str, 
    assistant_response: str,
    threshold: float = 0.5
) -> List[CardSuggestion]:
    """
    分析对话，提取可能需要创建为知识卡片的内容
    """
    suggestions = []
    
    # 从用户问题中提取
    suggestions.extend(extract_facts_from_text(user_query))
    suggestions.extend(extract_risks_from_text(user_query))
    suggestions.extend(extract_actions_from_text(user_query))
    
    # 从回复中提取
    suggestions.extend(extract_facts_from_text(assistant_response))
    suggestions.extend(extract_risks_from_text(assistant_response))
    suggestions.extend(extract_actions_from_text(assistant_response))
    suggestions.extend(extract_explanations_from_text(assistant_response))
    
    # 去重并过滤低置信度
    seen = set()
    filtered = []
    for s in suggestions:
        key = s.title[:20]
        if key not in seen and s.confidence >= threshold:
            seen.add(key)
            filtered.append(s)
    
    return filtered[:5]


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
        
        # 确定分类
        category_map = {
            "blue": "事实",
            "green": "解释", 
            "yellow": "风险",
            "red": "行动"
        }
        
        cursor.execute("""
            INSERT INTO knowledge_cards 
            (id, title, content, type, category, similarity, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, [
            card_id,
            suggestion.title,
            suggestion.content,
            suggestion.card_type,
            category_map.get(suggestion.card_type, "事实"),
            suggestion.confidence
        ])
        
        conn.commit()
        conn.close()
        
        logger.info(f"[AutoCard] 创建卡片: {card_id} - {suggestion.title}")
        return card_id
        
    except Exception as e:
        logger.error(f"创建卡片失败: {e}")
        return None


def auto_create_cards(
    user_query: str,
    assistant_response: str,
    auto_threshold: float = 0.7
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
                    "confidence": suggestion.confidence
                })
    
    return {
        "suggestions_count": len(suggestions),
        "auto_created_count": len(created),
        "created_cards": created,
        "all_suggestions": [
            {
                "title": s.title,
                "type": s.card_type,
                "confidence": s.confidence
            }
            for s in suggestions
        ]
    }


def suggest_cards_api(
    user_query: str,
    assistant_response: str
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
                "reason": _get_type_reason(s.card_type)
            }
            for s in suggestions
        ]
    }


def _get_type_reason(card_type: str) -> str:
    """获取类型建议的原因"""
    reasons = {
        "blue": "包含明确的事实或数据",
        "green": "包含原因或解释",
        "yellow": "包含风险或注意事项",
        "red": "包含行动建议或任务"
    }
    return reasons.get(card_type, "一般信息")