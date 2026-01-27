"""
Knowledge Graph Visualization Skill
知识图谱可视化技能
"""
import logging
from typing import Dict, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class KnowledgeGraphVisualizationSkill:
    """知识图谱可视化技能"""
    
    def __init__(self):
        self.name = "knowledge_graph_visualization"
        self.description = "知识图谱可视化：构建和展示卡片间的关联关系"
        self.category = "知识管理"
        self.agent_name = "太史阁"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    async def execute(self, cards: List[Dict] = None, **kwargs) -> Dict[str, Any]:
        """
        构建知识图谱
        
        参数:
            cards: 卡片列表
        
        返回:
            {
                "nodes": [{"id": "card_001", "label": "标题", "type": "blue", "category": "fact"}],
                "edges": [{"source": "card_001", "target": "card_002", "label": "解释", "type": "explains"}],
                "statistics": {"total_nodes": 10, "total_edges": 15, "node_types": {...}}
            }
        """
        try:
            logger.info(f"[{self.name}] 开始构建知识图谱")
            
            # 如果没有提供卡片，从数据库加载
            if cards is None:
                cards = await self._load_cards_from_database()
            
            # 1. 提取节点（卡片）
            nodes = self._extract_nodes(cards)
            logger.info(f"[{self.name}] 提取了 {len(nodes)} 个节点")
            
            # 2. 构建边（关联关系）
            edges = self._build_edges(cards)
            logger.info(f"[{self.name}] 构建了 {len(edges)} 条边")
            
            # 3. 计算统计信息
            statistics = self._calculate_statistics(nodes, edges)
            
            # 4. 计算节点重要性
            node_importance = self._calculate_node_importance(nodes, edges)
            
            # 5. 添加重要性到节点
            for node in nodes:
                node['importance'] = node_importance.get(node['id'], 0)
                node['size'] = 10 + node['importance'] * 20  # 节点大小
            
            result = {
                "nodes": nodes,
                "edges": edges,
                "statistics": statistics,
                "layout": "force",  # 推荐使用力导向布局
                "generated_at": datetime.now().isoformat()
            }
            
            logger.info(f"[{self.name}] 知识图谱构建完成")
            return result
            
        except Exception as e:
            logger.error(f"[{self.name}] 构建知识图谱失败: {e}", exc_info=True)
            raise
    
    def _extract_nodes(self, cards: List[Dict]) -> List[Dict]:
        """提取节点"""
        nodes = []
        
        for card in cards:
            node = {
                "id": card.get("id", card.get("card_id", f"card_{len(nodes)}")),
                "label": card.get("title", card.get("name", "未命名")),
                "type": card.get("type", card.get("card_type", "blue")),
                "category": self._get_category_by_type(card.get("type", "blue")),
                "content": card.get("content", {}),
                "tags": card.get("tags", []),
                "created_at": card.get("created_at", card.get("timestamp", "")),
                "confidence": card.get("confidence", 1.0)
            }
            nodes.append(node)
        
        return nodes
    
    def _build_edges(self, cards: List[Dict]) -> List[Dict]:
        """构建边（关联关系）"""
        edges = []
        edge_id = 0
        
        for card in cards:
            card_id = card.get("id", card.get("card_id"))
            
            # 1. 基于引用关系
            references = card.get("references", [])
            for ref_id in references:
                edges.append({
                    "id": f"edge_{edge_id}",
                    "source": card_id,
                    "target": ref_id,
                    "label": "引用",
                    "type": "reference",
                    "weight": 1.0
                })
                edge_id += 1
            
            # 2. 基于标签相似度
            card_tags = set(card.get("tags", []))
            if card_tags:
                for other_card in cards:
                    other_id = other_card.get("id", other_card.get("card_id"))
                    if other_id == card_id:
                        continue
                    
                    other_tags = set(other_card.get("tags", []))
                    if other_tags:
                        # 计算标签交集
                        common_tags = card_tags & other_tags
                        if common_tags:
                            similarity = len(common_tags) / len(card_tags | other_tags)
                            if similarity > 0.3:  # 相似度阈值
                                edges.append({
                                    "id": f"edge_{edge_id}",
                                    "source": card_id,
                                    "target": other_id,
                                    "label": f"相似 ({len(common_tags)} 个共同标签)",
                                    "type": "similarity",
                                    "weight": similarity,
                                    "common_tags": list(common_tags)
                                })
                                edge_id += 1
            
            # 3. 基于四色卡片关系
            card_type = card.get("type", "blue")
            for other_card in cards:
                other_id = other_card.get("id", other_card.get("card_id"))
                other_type = other_card.get("type", "blue")
                
                if other_id == card_id:
                    continue
                
                # 蓝色（事实）-> 绿色（解释）
                if card_type == "blue" and other_type == "green":
                    if self._is_related_by_content(card, other_card):
                        edges.append({
                            "id": f"edge_{edge_id}",
                            "source": card_id,
                            "target": other_id,
                            "label": "解释",
                            "type": "explains",
                            "weight": 0.8
                        })
                        edge_id += 1
                
                # 蓝色（事实）-> 黄色（风险）
                elif card_type == "blue" and other_type == "yellow":
                    if self._is_related_by_content(card, other_card):
                        edges.append({
                            "id": f"edge_{edge_id}",
                            "source": card_id,
                            "target": other_id,
                            "label": "风险",
                            "type": "risk",
                            "weight": 0.7
                        })
                        edge_id += 1
                
                # 黄色（风险）-> 红色（行动）
                elif card_type == "yellow" and other_type == "red":
                    if self._is_related_by_content(card, other_card):
                        edges.append({
                            "id": f"edge_{edge_id}",
                            "source": card_id,
                            "target": other_id,
                            "label": "应对",
                            "type": "action",
                            "weight": 0.9
                        })
                        edge_id += 1
        
        # 去重
        unique_edges = []
        seen = set()
        for edge in edges:
            key = (edge['source'], edge['target'], edge['type'])
            if key not in seen:
                seen.add(key)
                unique_edges.append(edge)
        
        return unique_edges
    
    def _is_related_by_content(self, card1: Dict, card2: Dict) -> bool:
        """判断两个卡片是否通过内容相关"""
        # 简单的关键词匹配
        content1 = str(card1.get("content", "")).lower()
        content2 = str(card2.get("content", "")).lower()
        title1 = card1.get("title", "").lower()
        title2 = card2.get("title", "").lower()
        
        # 检查标题是否出现在对方内容中
        if title1 in content2 or title2 in content1:
            return True
        
        # 检查共同关键词
        words1 = set(content1.split())
        words2 = set(content2.split())
        common_words = words1 & words2
        
        # 过滤停用词
        stopwords = {'的', '了', '在', '是', '和', '与', '或', '等', '及', '以', '为', '对', '从', '到'}
        common_words = common_words - stopwords
        
        return len(common_words) > 3
    
    def _calculate_statistics(self, nodes: List[Dict], edges: List[Dict]) -> Dict:
        """计算统计信息"""
        # 节点类型统计
        node_types = {}
        for node in nodes:
            node_type = node['type']
            node_types[node_type] = node_types.get(node_type, 0) + 1
        
        # 边类型统计
        edge_types = {}
        for edge in edges:
            edge_type = edge['type']
            edge_types[edge_type] = edge_types.get(edge_type, 0) + 1
        
        # 节点度数统计
        node_degrees = {}
        for edge in edges:
            source = edge['source']
            target = edge['target']
            node_degrees[source] = node_degrees.get(source, 0) + 1
            node_degrees[target] = node_degrees.get(target, 0) + 1
        
        # 找出度数最高的节点
        if node_degrees:
            max_degree_node = max(node_degrees.items(), key=lambda x: x[1])
        else:
            max_degree_node = (None, 0)
        
        return {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "node_types": node_types,
            "edge_types": edge_types,
            "average_degree": sum(node_degrees.values()) / len(nodes) if nodes else 0,
            "max_degree_node": {
                "id": max_degree_node[0],
                "degree": max_degree_node[1]
            },
            "density": (2 * len(edges)) / (len(nodes) * (len(nodes) - 1)) if len(nodes) > 1 else 0
        }
    
    def _calculate_node_importance(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, float]:
        """计算节点重要性（基于度中心性）"""
        importance = {}
        
        # 计算每个节点的度数
        for node in nodes:
            node_id = node['id']
            degree = 0
            for edge in edges:
                if edge['source'] == node_id or edge['target'] == node_id:
                    degree += edge.get('weight', 1.0)
            importance[node_id] = degree
        
        # 归一化
        if importance:
            max_importance = max(importance.values())
            if max_importance > 0:
                importance = {k: v / max_importance for k, v in importance.items()}
        
        return importance
    
    def _get_category_by_type(self, card_type: str) -> str:
        """根据卡片类型获取类别名称"""
        type_mapping = {
            "blue": "fact",
            "green": "interpret",
            "yellow": "risk",
            "red": "action"
        }
        return type_mapping.get(card_type, "unknown")
    
    async def _load_cards_from_database(self) -> List[Dict]:
        """从数据库加载卡片"""
        try:
            from database import DatabaseManager
            from config import settings
            
            db = DatabaseManager(settings.DB_PATH)
            cards = db.get_all_cards()
            return cards
        except Exception as e:
            logger.warning(f"[{self.name}] 从数据库加载卡片失败: {e}")
            # 返回示例数据
            return self._get_sample_cards()
    
    def _get_sample_cards(self) -> List[Dict]:
        """获取示例卡片"""
        return [
            {
                "id": "card_001",
                "title": "Antinet系统概述",
                "type": "blue",
                "content": {"description": "Antinet智能知识管家是一款部署于骁龙AIPC的端侧智能数据工作站"},
                "tags": ["系统", "概述", "AIPC"],
                "created_at": "2026-01-26"
            },
            {
                "id": "card_002",
                "title": "为什么使用Antinet",
                "type": "green",
                "content": {"explanation": "Antinet基于卢曼卡片盒笔记法，采用四色卡片进行知识组织"},
                "tags": ["原因", "方法论", "卡片盒"],
                "references": ["card_001"],
                "created_at": "2026-01-26"
            },
            {
                "id": "card_003",
                "title": "数据备份风险",
                "type": "yellow",
                "content": {"risk_level": "高", "description": "当前版本数据存储在本地SQLite数据库中"},
                "tags": ["风险", "备份", "数据"],
                "created_at": "2026-01-26"
            },
            {
                "id": "card_004",
                "title": "启动后端服务",
                "type": "red",
                "content": {"priority": "高", "action": "运行start_complete_system.bat一键启动"},
                "tags": ["行动", "启动", "服务"],
                "references": ["card_001"],
                "created_at": "2026-01-26"
            }
        ]
    
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
