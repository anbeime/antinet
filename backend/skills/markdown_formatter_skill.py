"""
Markdown Formatter Skill
Markdown 格式化技能 - 将四色卡片转换为 Markdown Callouts
"""
import logging
from typing import Dict, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class MarkdownFormatterSkill:
    """Markdown 格式化技能"""
    
    def __init__(self):
        self.name = "markdown_formatter"
        self.description = "将四色卡片转换为 Markdown Callouts 格式"
        self.category = "知识管理"
        self.agent_name = "太史阁"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
        
        # 卡片类型到 Callout 类型的映射
        self.card_to_callout = {
            "blue": "note",      # 蓝色（事实）→ note
            "green": "tip",      # 绿色（解释）→ tip
            "yellow": "warning", # 黄色（风险）→ warning
            "red": "danger"      # 红色（行动）→ danger
        }
        
        # Callout 图标
        self.callout_icons = {
            "note": "[注]",
            "tip": "[提示]",
            "warning": "[警告]",
            "danger": "[危险]"
        }
    
    async def execute(self, cards: List[Dict] = None, format_type: str = "callouts", **kwargs) -> Dict[str, Any]:
        """
        将卡片转换为 Markdown 格式
        
        参数:
            cards: 卡片列表
            format_type: 格式类型 (callouts, table, list)
        
        返回:
            {
                "markdown": "格式化后的 Markdown 文本",
                "format": "使用的格式类型",
                "card_count": 卡片数量
            }
        """
        try:
            logger.info(f"[{self.name}] 开始格式化 {len(cards) if cards else 0} 张卡片")
            
            if not cards:
                return {
                    "markdown": "",
                    "format": format_type,
                    "card_count": 0
                }
            
            # 根据格式类型选择转换方法
            if format_type == "callouts":
                markdown = self._format_as_callouts(cards)
            elif format_type == "table":
                markdown = self._format_as_table(cards)
            elif format_type == "list":
                markdown = self._format_as_list(cards)
            else:
                markdown = self._format_as_callouts(cards)
            
            logger.info(f"[{self.name}] 格式化完成，生成 {len(markdown)} 字符")
            
            return {
                "markdown": markdown,
                "format": format_type,
                "card_count": len(cards),
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 格式化失败: {e}", exc_info=True)
            raise
    
    def _format_as_callouts(self, cards: List[Dict]) -> str:
        """转换为 Callouts 格式"""
        markdown_lines = []
        
        # 添加标题
        markdown_lines.append("# 知识卡片集合")
        markdown_lines.append("")
        markdown_lines.append(f"*生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        markdown_lines.append("")
        
        # 按类型分组
        cards_by_type = {}
        for card in cards:
            card_type = card.get("type", "blue")
            if card_type not in cards_by_type:
                cards_by_type[card_type] = []
            cards_by_type[card_type].append(card)
        
        # 按类型顺序输出
        type_order = ["blue", "green", "yellow", "red"]
        type_names = {
            "blue": "事实卡片",
            "green": "解释卡片",
            "yellow": "风险卡片",
            "red": "行动卡片"
        }
        
        for card_type in type_order:
            if card_type not in cards_by_type:
                continue
            
            type_cards = cards_by_type[card_type]
            callout_type = self.card_to_callout[card_type]
            icon = self.callout_icons[callout_type]
            
            markdown_lines.append(f"## {icon} {type_names[card_type]} ({len(type_cards)})")
            markdown_lines.append("")
            
            for card in type_cards:
                title = card.get("title", "未命名")
                content = card.get("content", {})
                
                # 格式化内容
                if isinstance(content, dict):
                    content_str = self._format_content_dict(content)
                else:
                    content_str = str(content)
                
                # 生成 Callout
                markdown_lines.append(f"> [!{callout_type}] {title}")
                
                # 添加内容（每行前加 > ）
                for line in content_str.split('\n'):
                    if line.strip():
                        markdown_lines.append(f"> {line}")
                
                # 添加元数据
                if card.get("tags"):
                    tags_str = ", ".join(f"#{tag}" for tag in card["tags"])
                    markdown_lines.append(f"> ")
                    markdown_lines.append(f"> 🏷️ {tags_str}")
                
                if card.get("confidence"):
                    confidence = card["confidence"]
                    markdown_lines.append(f"> 📊 置信度: {confidence:.1%}")
                
                markdown_lines.append("")
        
        return "\n".join(markdown_lines)
    
    def _format_as_table(self, cards: List[Dict]) -> str:
        """转换为表格格式"""
        markdown_lines = []
        
        markdown_lines.append("# 知识卡片表格")
        markdown_lines.append("")
        
        # 表头
        markdown_lines.append("| 类型 | 标题 | 内容 | 标签 | 置信度 |")
        markdown_lines.append("| --- | --- | --- | --- | --- |")
        
        # 数据行
        for card in cards:
            card_type = card.get("type", "blue")
            title = card.get("title", "未命名")
            content = card.get("content", {})
            tags = ", ".join(card.get("tags", []))
            confidence = f"{card.get('confidence', 0):.1%}" if card.get("confidence") else "N/A"
            
            # 简化内容
            if isinstance(content, dict):
                content_str = str(content.get("description", ""))[:50]
            else:
                content_str = str(content)[:50]
            
            # 类型标识
            type_icons = {"blue": "[蓝]", "green": "[绿]", "yellow": "[黄]", "red": "[红]"}
            type_icon = type_icons.get(card_type, "[无]")
            
            markdown_lines.append(f"| {type_icon} {card_type} | {title} | {content_str}... | {tags} | {confidence} |")
        
        return "\n".join(markdown_lines)
    
    def _format_as_list(self, cards: List[Dict]) -> str:
        """转换为列表格式"""
        markdown_lines = []
        
        markdown_lines.append("# 知识卡片列表")
        markdown_lines.append("")
        
        for i, card in enumerate(cards, 1):
            card_type = card.get("type", "blue")
            title = card.get("title", "未命名")
            content = card.get("content", {})
            
            # 类型标识
            type_icons = {"blue": "[蓝]", "green": "[绿]", "yellow": "[黄]", "red": "[红]"}
            type_icon = type_icons.get(card_type, "[无]")
            
            markdown_lines.append(f"{i}. {type_icon} **{title}**")
            
            # 内容
            if isinstance(content, dict):
                content_str = self._format_content_dict(content)
            else:
                content_str = str(content)
            
            markdown_lines.append(f"   {content_str[:100]}...")
            
            # 标签
            if card.get("tags"):
                tags_str = ", ".join(f"`{tag}`" for tag in card["tags"])
                markdown_lines.append(f"   [标签] {tags_str}")
            
            markdown_lines.append("")
        
        return "\n".join(markdown_lines)
    
    def _format_content_dict(self, content: Dict) -> str:
        """格式化内容字典"""
        lines = []
        for key, value in content.items():
            if key == "description":
                lines.append(str(value))
            else:
                lines.append(f"**{key}**: {value}")
        return "\n".join(lines)
    
    def get_info(self) -> Dict:
        """获取技能信息"""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "agent_name": self.agent_name,
            "enabled": self.enabled,
            "last_used": self.last_used,
            "usage_count": self.usage_count
        }
