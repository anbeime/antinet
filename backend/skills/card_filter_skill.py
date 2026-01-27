"""
Card Filter Skill
卡片过滤技能 - 提供高级过滤功能（AND/OR/NOT）
"""
import logging
from typing import Dict, List, Any
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class CardFilterSkill:
    """卡片过滤技能"""
    
    def __init__(self):
        self.name = "card_filter"
        self.description = "高级卡片过滤（支持 AND/OR/NOT 逻辑）"
        self.category = "知识管理"
        self.agent_name = "太史阁"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    async def execute(self, cards: List[Dict] = None, filters: Dict = None, **kwargs) -> Dict[str, Any]:
        """
        高级过滤卡片
        
        参数:
            cards: 卡片列表
            filters: 过滤条件
                {
                    "and": [
                        {"type": "blue"},
                        {"confidence": {">=": 0.8}}
                    ],
                    "or": [
                        {"tags": {"contains": "重要"}},
                        {"tags": {"contains": "紧急"}}
                    ],
                    "not": [
                        {"type": "yellow"}
                    ]
                }
        
        返回:
            {
                "cards": [...],  # 过滤后的卡片
                "count": 10,     # 数量
                "filters_applied": {...}  # 应用的过滤器
            }
        """
        try:
            logger.info(f"[{self.name}] 开始过滤，原始卡片数: {len(cards) if cards else 0}")
            
            if not cards:
                return {
                    "cards": [],
                    "count": 0,
                    "filters_applied": filters or {}
                }
            
            if not filters:
                return {
                    "cards": cards,
                    "count": len(cards),
                    "filters_applied": {}
                }
            
            # 应用过滤器
            filtered_cards = self._apply_filters(cards, filters)
            
            logger.info(f"[{self.name}] 过滤完成，结果数: {len(filtered_cards)}")
            
            return {
                "cards": filtered_cards,
                "count": len(filtered_cards),
                "original_count": len(cards),
                "filters_applied": filters,
                "filtered_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 过滤失败: {e}", exc_info=True)
            raise
    
    def _apply_filters(self, cards: List[Dict], filters: Dict) -> List[Dict]:
        """应用过滤器"""
        result = cards.copy()
        
        # 应用 AND 过滤器（所有条件都必须满足）
        if "and" in filters:
            for condition in filters["and"]:
                result = self._filter_by_condition(result, condition)
        
        # 应用 OR 过滤器（任一条件满足即可）
        if "or" in filters:
            or_results = []
            for condition in filters["or"]:
                matched = self._filter_by_condition(cards, condition)
                or_results.extend(matched)
            
            # 去重
            result = list({card["id"]: card for card in or_results}.values())
        
        # 应用 NOT 过滤器（排除满足条件的）
        if "not" in filters:
            for condition in filters["not"]:
                exclude = self._filter_by_condition(result, condition)
                exclude_ids = {card.get("id") for card in exclude}
                result = [card for card in result if card.get("id") not in exclude_ids]
        
        return result
    
    def _filter_by_condition(self, cards: List[Dict], condition: Dict) -> List[Dict]:
        """根据单个条件过滤"""
        result = []
        
        for card in cards:
            if self._match_condition(card, condition):
                result.append(card)
        
        return result
    
    def _match_condition(self, card: Dict, condition: Dict) -> bool:
        """检查卡片是否匹配条件"""
        for field, criteria in condition.items():
            card_value = self._get_nested_value(card, field)
            
            # 如果是字典，表示有操作符
            if isinstance(criteria, dict):
                if not self._match_operator(card_value, criteria):
                    return False
            # 否则是直接比较
            else:
                if card_value != criteria:
                    return False
        
        return True
    
    def _match_operator(self, value: Any, criteria: Dict) -> bool:
        """匹配操作符"""
        for operator, target in criteria.items():
            if operator == "==":
                if value != target:
                    return False
            elif operator == "!=":
                if value == target:
                    return False
            elif operator == ">":
                if not (value > target):
                    return False
            elif operator == "<":
                if not (value < target):
                    return False
            elif operator == ">=":
                if not (value >= target):
                    return False
            elif operator == "<=":
                if not (value <= target):
                    return False
            elif operator == "contains":
                if isinstance(value, list):
                    if target not in value:
                        return False
                elif isinstance(value, str):
                    if target not in value:
                        return False
                else:
                    return False
            elif operator == "not_contains":
                if isinstance(value, list):
                    if target in value:
                        return False
                elif isinstance(value, str):
                    if target in value:
                        return False
            elif operator == "in":
                if value not in target:
                    return False
            elif operator == "not_in":
                if value in target:
                    return False
            elif operator == "regex":
                if not re.search(target, str(value)):
                    return False
            elif operator == "starts_with":
                if not str(value).startswith(target):
                    return False
            elif operator == "ends_with":
                if not str(value).endswith(target):
                    return False
        
        return True
    
    def _get_nested_value(self, obj: Dict, path: str) -> Any:
        """获取嵌套字段的值"""
        keys = path.split(".")
        value = obj
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        
        return value
    
    def get_info(self) -> Dict:
        """获取技能信息"""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "agent_name": self.agent_name,
            "enabled": self.enabled,
            "last_used": self.last_used,
            "usage_count": self.usage_count,
            "supported_operators": [
                "==", "!=", ">", "<", ">=", "<=",
                "contains", "not_contains",
                "in", "not_in",
                "regex", "starts_with", "ends_with"
            ],
            "supported_logic": ["and", "or", "not"]
        }
