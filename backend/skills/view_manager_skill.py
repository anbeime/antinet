"""
View Manager Skill
视图管理技能 - 提供多种数据展示方式
"""
import logging
from typing import Dict, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ViewManagerSkill:
    """视图管理技能"""
    
    def __init__(self):
        self.name = "view_manager"
        self.description = "提供多种数据视图（表格、卡片、列表、图谱、时间线）"
        self.category = "知识管理"
        self.agent_name = "太史阁"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
        
        # 支持的视图类型
        self.supported_views = [
            "table",    # 表格视图
            "cards",    # 卡片视图
            "list",     # 列表视图
            "graph",    # 图谱视图
            "timeline"  # 时间线视图
        ]
    
    async def execute(self, cards: List[Dict] = None, view_type: str = "cards", **kwargs) -> Dict[str, Any]:
        """
        根据视图类型展示卡片
        
        参数:
            cards: 卡片列表
            view_type: 视图类型 (table, cards, list, graph, timeline)
        
        返回:
            {
                "view_type": "cards",
                "data": {...},  # 视图数据
                "config": {...} # 视图配置
            }
        """
        try:
            logger.info(f"[{self.name}] 生成 {view_type} 视图，卡片数: {len(cards) if cards else 0}")
            
            if not cards:
                return {
                    "view_type": view_type,
                    "data": [],
                    "config": {},
                    "card_count": 0
                }
            
            # 根据视图类型生成数据
            if view_type == "table":
                result = self._table_view(cards)
            elif view_type == "cards":
                result = self._cards_view(cards)
            elif view_type == "list":
                result = self._list_view(cards)
            elif view_type == "graph":
                result = self._graph_view(cards)
            elif view_type == "timeline":
                result = self._timeline_view(cards)
            else:
                result = self._cards_view(cards)
            
            result["view_type"] = view_type
            result["card_count"] = len(cards)
            result["generated_at"] = datetime.now().isoformat()
            
            logger.info(f"[{self.name}] {view_type} 视图生成完成")
            return result
            
        except Exception as e:
            logger.error(f"[{self.name}] 视图生成失败: {e}", exc_info=True)
            raise
    
    def _table_view(self, cards: List[Dict]) -> Dict:
        """表格视图"""
        columns = [
            {"key": "type", "label": "类型", "width": 80},
            {"key": "title", "label": "标题", "width": 200},
            {"key": "content", "label": "内容", "width": 300},
            {"key": "tags", "label": "标签", "width": 150},
            {"key": "confidence", "label": "置信度", "width": 100},
            {"key": "created_at", "label": "创建时间", "width": 150}
        ]
        
        rows = []
        for card in cards:
            # 格式化内容
            content = card.get("content", {})
            if isinstance(content, dict):
                content_str = content.get("description", str(content))[:100]
            else:
                content_str = str(content)[:100]
            
            rows.append({
                "id": card.get("id", ""),
                "type": card.get("type", "blue"),
                "title": card.get("title", "未命名"),
                "content": content_str,
                "tags": ", ".join(card.get("tags", [])),
                "confidence": f"{card.get('confidence', 0):.1%}" if card.get("confidence") else "N/A",
                "created_at": card.get("created_at", card.get("timestamp", ""))
            })
        
        return {
            "data": {
                "columns": columns,
                "rows": rows
            },
            "config": {
                "sortable": True,
                "filterable": True,
                "paginated": True,
                "page_size": 20
            }
        }
    
    def _cards_view(self, cards: List[Dict]) -> Dict:
        """卡片视图"""
        card_data = []
        
        for card in cards:
            card_type = card.get("type", "blue")
            
            # 卡片颜色
            colors = {
                "blue": {"bg": "#E3F2FD", "border": "#2196F3"},
                "green": {"bg": "#E8F5E9", "border": "#4CAF50"},
                "yellow": {"bg": "#FFF9C4", "border": "#FFC107"},
                "red": {"bg": "#FFEBEE", "border": "#F44336"}
            }
            
            card_data.append({
                "id": card.get("id", ""),
                "type": card_type,
                "title": card.get("title", "未命名"),
                "content": card.get("content", {}),
                "tags": card.get("tags", []),
                "confidence": card.get("confidence", 0),
                "created_at": card.get("created_at", ""),
                "style": colors.get(card_type, colors["blue"])
            })
        
        return {
            "data": {
                "cards": card_data
            },
            "config": {
                "layout": "grid",
                "columns": 3,
                "card_width": 300,
                "card_height": 200,
                "spacing": 16
            }
        }
    
    def _list_view(self, cards: List[Dict]) -> Dict:
        """列表视图"""
        items = []
        
        for card in cards:
            # 图标
            icons = {
                "blue": "📘",
                "green": "💡",
                "yellow": "[WARN]️",
                "red": "🔴"
            }
            
            items.append({
                "id": card.get("id", ""),
                "icon": icons.get(card.get("type", "blue"), "📄"),
                "title": card.get("title", "未命名"),
                "subtitle": self._get_card_subtitle(card),
                "tags": card.get("tags", []),
                "metadata": {
                    "type": card.get("type", "blue"),
                    "confidence": card.get("confidence", 0),
                    "created_at": card.get("created_at", "")
                }
            })
        
        return {
            "data": {
                "items": items
            },
            "config": {
                "show_icons": True,
                "show_tags": True,
                "show_metadata": True,
                "compact": False
            }
        }
    
    def _graph_view(self, cards: List[Dict]) -> Dict:
        """图谱视图"""
        nodes = []
        edges = []
        
        # 构建节点
        for card in cards:
            nodes.append({
                "id": card.get("id", ""),
                "label": card.get("title", "未命名"),
                "type": card.get("type", "blue"),
                "size": 20 + (card.get("confidence", 0) * 30),
                "data": card
            })
        
        # 构建边（基于引用关系）
        for card in cards:
            card_id = card.get("id", "")
            references = card.get("references", [])
            
            for ref_id in references:
                edges.append({
                    "source": card_id,
                    "target": ref_id,
                    "label": "引用",
                    "type": "reference"
                })
        
        return {
            "data": {
                "nodes": nodes,
                "edges": edges
            },
            "config": {
                "layout": "force",
                "physics": {
                    "enabled": True,
                    "repulsion": 100,
                    "gravity": 0.1
                },
                "interaction": {
                    "dragNodes": True,
                    "zoomView": True,
                    "dragView": True
                }
            }
        }
    
    def _timeline_view(self, cards: List[Dict]) -> Dict:
        """时间线视图"""
        events = []
        
        # 按时间排序
        sorted_cards = sorted(
            cards,
            key=lambda x: x.get("created_at", x.get("timestamp", "")),
            reverse=True
        )
        
        for card in sorted_cards:
            # 时间戳
            timestamp = card.get("created_at", card.get("timestamp", ""))
            
            # 事件类型
            event_types = {
                "blue": "fact",
                "green": "insight",
                "yellow": "warning",
                "red": "action"
            }
            
            events.append({
                "id": card.get("id", ""),
                "timestamp": timestamp,
                "type": event_types.get(card.get("type", "blue"), "fact"),
                "title": card.get("title", "未命名"),
                "description": self._get_card_subtitle(card),
                "tags": card.get("tags", []),
                "card_type": card.get("type", "blue")
            })
        
        return {
            "data": {
                "events": events
            },
            "config": {
                "orientation": "vertical",
                "show_date": True,
                "show_time": True,
                "group_by_date": True
            }
        }
    
    def _get_card_subtitle(self, card: Dict) -> str:
        """获取卡片副标题"""
        content = card.get("content", {})
        
        if isinstance(content, dict):
            if "description" in content:
                return str(content["description"])[:100]
            else:
                return str(list(content.values())[0])[:100] if content else ""
        else:
            return str(content)[:100]
    
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
            "supported_views": self.supported_views
        }
