"""
Four-Color Card Knowledge Base Skill for Hermes Agent

四色卡片知识库技能 - 集成到Hermes Agent系统
负责从各种信息源中提取、组织和进化结构化知识

卡片类型：
- 🔵 蓝色(事实): 客观数据、定义、事件、统计结果
- 🟢 绿色(解释): 背景、原理、原因、逻辑解释
- 🟡 黄色(风险): 隐患、问题、反面案例、潜在威胁
- 🔴 红色(动力): 行动建议、机会、推动力、解决方案
"""

import logging
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

# ============================================================================
# 四色卡片数据模型
# ============================================================================

@dataclass
class FourColorCard:
    """四色卡片数据模型"""
    card_id: str
    card_type: str  # blue/green/yellow/red
    card_type_cn: str  # 事实/解释/风险/行动
    title: str
    content: str
    source: str = ""
    timestamp: str = ""
    confidence: float = 1.0
    tags: List[str] = None
    explore_status: str = "待探索"  # 待探索/探索中/已探索
    related_cards: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.related_cards is None:
            self.related_cards = []
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @property
    def color_emoji(self) -> str:
        return {"blue": "🔵", "green": "🟢", "yellow": "🟡", "red": "🔴"}.get(self.card_type, "⚪")


@dataclass
class ExtractionResult:
    """提取结果"""
    cards: List[FourColorCard]
    statistics: Dict[str, int]
    quality_assessment: Dict[str, float]
    key_findings: List[str]
    exploration_suggestions: List[str]


# ============================================================================
# 四色卡片系统提示词（精简版 - 适合端侧模型）
# ============================================================================

HERMES_SYSTEM_PROMPT = """# 四色卡片知识管理

你是四色卡片知识管理AI，负责从信息中提取结构化知识。

## 核心任务
将信息分类为四色卡片：
- 🔵 事实卡：客观数据、事件、统计
- 🟢 解释卡：原理、原因、逻辑
- 🟡 风险卡：隐患、威胁、问题
- 🔴 动力卡：行动、机会、方案

## 提取规则
1. 每次处理15-20条信息
2. 卡片必须包含：类型、内容、来源、时间、标签
3. 建立卡片间关联（至少1个关联）
4. 标记"待探索"卡片

## 响应格式
[卡片提取] → [关联建立] → [探索建议]
"""


# ============================================================================
# 四色卡片提取器
# ============================================================================

class FourColorCardExtractor:
    """四色卡片提取器"""
    
    # 卡片类型映射
    CARD_TYPES = {
        "事实": {"type": "blue", "emoji": "🔵", "keywords": ["数据", "统计", "事件", "结果", "显示", "表明", "达到", "增长", "下降"]},
        "解释": {"type": "green", "emoji": "🟢", "keywords": ["因为", "由于", "原因", "原理", "机制", "解释", "意味着", "说明"]},
        "风险": {"type": "yellow", "emoji": "🟡", "keywords": ["风险", "隐患", "问题", "威胁", "可能", "挑战", "困难", "不足", "竞争"]},
        "行动": {"type": "red", "emoji": "🔴", "keywords": ["建议", "应该", "需要", "可以", "方案", "机会", "行动", "发布", "优化", "改进"]}
    }
    
    def __init__(self):
        self.card_counter = 0
    
    def _generate_card_id(self, card_type: str) -> str:
        """生成卡片ID"""
        self.card_counter += 1
        timestamp = datetime.now().strftime("%Y%m%d")
        return f"{card_type[:2].upper()}_{timestamp}_{self.card_counter:03d}"
    
    def _classify_content(self, content: str) -> tuple[str, str]:
        """分类内容到四色卡片"""
        content_lower = content.lower()
        
        # 评分每个类型
        scores = {}
        for cn_type, info in self.CARD_TYPES.items():
            score = 0
            for keyword in info["keywords"]:
                if keyword in content_lower:
                    score += 1
            scores[cn_type] = score
        
        # 最高分类型
        if max(scores.values()) > 0:
            best_type = max(scores, key=scores.get)
        else:
            # 默认根据内容特征判断
            if any(w in content_lower for w in ["可能", "风险", "问题", "挑战"]):
                best_type = "风险"
            elif any(w in content_lower for w in ["建议", "应该", "需要", "可以"]):
                best_type = "行动"
            elif any(w in content_lower for w in ["因为", "由于", "原因"]):
                best_type = "解释"
            else:
                best_type = "事实"
        
        return best_type, self.CARD_TYPES[best_type]["type"]
    
    def _extract_title(self, content: str) -> str:
        """提取标题"""
        # 取前30个字符作为标题
        return content[:30].strip() + ("..." if len(content) > 30 else "")
    
    def _extract_tags(self, content: str) -> List[str]:
        """提取标签"""
        tags = []
        # 提取#标签
        tags.extend(re.findall(r'#(\w+)', content))
        # 提取关键词作为标签
        keywords = ["产品", "技术", "市场", "用户", "研发", "运营", "战略", "竞争", "发布", "延迟"]
        for kw in keywords:
            if kw in content:
                tags.append(kw)
        return list(set(tags))[:5]  # 最多5个标签
    
    def extract_from_text(self, text: str, source: str = "") -> ExtractionResult:
        """从文本中提取四色卡片"""
        # 分割文本为句子
        sentences = re.split(r'[。！？\n]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        cards = []
        for sentence in sentences:
            if not sentence:
                continue
            
            cn_type, en_type = self._classify_content(sentence)
            card = FourColorCard(
                card_id=self._generate_card_id(en_type),
                card_type=en_type,
                card_type_cn=cn_type,
                title=self._extract_title(sentence),
                content=sentence,
                source=source,
                tags=self._extract_tags(sentence)
            )
            cards.append(card)
        
        # 统计
        statistics = {
            "total": len(cards),
            "blue": sum(1 for c in cards if c.card_type == "blue"),
            "green": sum(1 for c in cards if c.card_type == "green"),
            "yellow": sum(1 for c in cards if c.card_type == "yellow"),
            "red": sum(1 for c in cards if c.card_type == "red")
        }
        
        # 质量评估
        quality_assessment = {
            "avg_confidence": sum(c.confidence for c in cards) / len(cards) if cards else 0,
            "high_quality_ratio": sum(1 for c in cards if c.confidence >= 0.8) / len(cards) if cards else 0
        }
        
        # 关键发现
        key_findings = [c.content for c in cards[:5] if c.card_type in ["red", "yellow"]]
        
        # 探索建议
        exploration_suggestions = [
            f"标记 {statistics['yellow']} 个风险卡片为待探索",
            f"建议搜索 {statistics['red']} 个行动方案的相关背景"
        ]
        
        return ExtractionResult(
            cards=cards,
            statistics=statistics,
            quality_assessment=quality_assessment,
            key_findings=key_findings,
            exploration_suggestions=exploration_suggestions
        )
    
    def build_relations(self, cards: List[FourColorCard]) -> List[Dict[str, str]]:
        """构建卡片关联关系"""
        relations = []
        
        for i, card in enumerate(cards):
            # 事实卡片关联解释卡片
            if card.card_type == "blue" and i + 1 < len(cards):
                next_card = cards[i + 1]
                if next_card.card_type in ["green", "red"]:
                    relations.append({
                        "from": card.card_id,
                        "to": next_card.card_id,
                        "relation": "explains" if next_card.card_type == "green" else "leads_to"
                    })
                    card.related_cards.append(next_card.card_id)
                    next_card.related_cards.append(card.card_id)
            
            # 风险卡片关联动力卡片
            if card.card_type == "yellow":
                for j, other in enumerate(cards):
                    if other.card_type == "red" and j != i:
                        relations.append({
                            "from": card.card_id,
                            "to": other.card_id,
                            "relation": "mitigated_by"
                        })
                        card.related_cards.append(other.card_id)
                        other.related_cards.append(card.card_id)
                        break
        
        return relations


# ============================================================================
# 四色卡片知识库技能
# ============================================================================

class FourColorCardSkill:
    """四色卡片知识库技能"""
    
    def __init__(self):
        self.name = "four_color_cards"
        self.description = "四色卡片知识库：从信息中提取结构化知识（事实/解释/风险/动力）"
        self.category = "知识管理"
        self.agent_name = "密卷房"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
        self.extractor = FourColorCardExtractor()
        self.card_storage: List[FourColorCard] = []
        self.relations: List[Dict[str, str]] = []
    
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        return HERMES_SYSTEM_PROMPT
    
    async def execute(
        self,
        text: str,
        source: str = "",
        build_relations: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行四色卡片提取
        
        Args:
            text: 待处理的文本内容
            source: 信息来源
            build_relations: 是否构建关联关系
        
        Returns:
            {
                "status": "success",
                "cards": [FourColorCard],
                "statistics": {...},
                "relations": [...],
                "system_prompt": "..."
            }
        """
        try:
            self.usage_count += 1
            self.last_used = datetime.now().isoformat()
            
            logger.info(f"[{self.name}] 开始提取四色卡片, 来源: {source}")
            
            # 提取卡片
            result = self.extractor.extract_from_text(text, source)
            
            # 构建关联
            relations = []
            if build_relations:
                relations = self.extractor.build_relations(result.cards)
            
            # 存储
            self.card_storage.extend(result.cards)
            self.relations.extend(relations)
            
            # 格式化输出
            cards_data = [c.to_dict() for c in result.cards]
            
            return {
                "status": "success",
                "cards": cards_data,
                "statistics": result.statistics,
                "quality_assessment": result.quality_assessment,
                "key_findings": result.key_findings,
                "exploration_suggestions": result.exploration_suggestions,
                "relations": relations,
                "system_prompt": self.get_system_prompt(),
                "total_cards_in_storage": len(self.card_storage),
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 提取失败: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e),
                "cards": [],
                "statistics": {"total": 0, "blue": 0, "green": 0, "yellow": 0, "red": 0}
            }
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """获取存储统计"""
        return {
            "total_cards": len(self.card_storage),
            "by_type": {
                "blue": sum(1 for c in self.card_storage if c.card_type == "blue"),
                "green": sum(1 for c in self.card_storage if c.card_type == "green"),
                "yellow": sum(1 for c in self.card_storage if c.card_type == "yellow"),
                "red": sum(1 for c in self.card_storage if c.card_type == "red")
            },
            "total_relations": len(self.relations),
            "explore_status": {
                "待探索": sum(1 for c in self.card_storage if c.explore_status == "待探索"),
                "探索中": sum(1 for c in self.card_storage if c.explore_status == "探索中"),
                "已探索": sum(1 for c in self.card_storage if c.explore_status == "已探索")
            }
        }
    
    def export_cards(self, card_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """导出卡片"""
        cards = self.card_storage
        if card_type:
            cards = [c for c in cards if c.card_type == card_type]
        return [c.to_dict() for c in cards]
    
    def clear_storage(self):
        """清空存储"""
        self.card_storage.clear()
        self.relations.clear()
        logger.info(f"[{self.name}] 存储已清空")


# 全局实例
_four_color_card_skill: Optional[FourColorCardSkill] = None

def get_four_color_card_skill() -> FourColorCardSkill:
    """获取四色卡片技能实例"""
    global _four_color_card_skill
    if _four_color_card_skill is None:
        _four_color_card_skill = FourColorCardSkill()
    return _four_color_card_skill