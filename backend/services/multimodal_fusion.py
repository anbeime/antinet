"""
多模态知识融合与检索模块
支持跨模态关联、语义搜索、关联扩散和视觉检索
"""
import logging
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import hashlib
import numpy as np

logger = logging.getLogger(__name__)


class MultiModalKnowledgeFusion:
    """多模态知识融合器"""
    
    def __init__(self, embedding_service=None):
        self.embedding_service = embedding_service
        self.knowledge_store = {}
        self.cross_modal_links = {}
    
    def register_knowledge(self, knowledge_id: str, content: Any, 
                           modality: str, metadata: Dict = None) -> str:
        """
        注册知识条目
        
        参数:
            knowledge_id: 知识ID
            content: 内容 (文本/图片/音频/表格)
            modality: 模态类型 (text/image/audio/table/chart)
            metadata: 元数据
        """
        if knowledge_id not in self.knowledge_store:
            self.knowledge_store[knowledge_id] = {
                "content": content,
                "modality": modality,
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat(),
                "linked_knowledge": []
            }
        
        logger.info(f"[Fusion] 注册知识: {knowledge_id} ({modality})")
        return knowledge_id
    
    def create_cross_modal_link(self, source_id: str, target_id: str, 
                                 link_type: str, confidence: float = 1.0):
        """创建跨模态关联"""
        if source_id not in self.cross_modal_links:
            self.cross_modal_links[source_id] = []
        
        self.cross_modal_links[source_id].append({
            "target_id": target_id,
            "link_type": link_type,
            "confidence": confidence,
            "created_at": datetime.now().isoformat()
        })
        
        logger.info(f"[Fusion] 跨模态关联: {source_id} -> {target_id} ({link_type})")
    
    def find_related_knowledge(self, knowledge_id: str, depth: int = 1) -> List[Dict]:
        """查找关联知识"""
        related = []
        visited = set()
        
        def dfs(kid: str, current_depth: int):
            if current_depth > depth or kid in visited:
                return
            
            visited.add(kid)
            
            if kid in self.cross_modal_links:
                for link in self.cross_modal_links[kid]:
                    related.append({
                        "knowledge_id": link["target_id"],
                        "link_type": link["link_type"],
                        "confidence": link["confidence"],
                        "distance": current_depth
                    })
                    dfs(link["target_id"], current_depth + 1)
        
        dfs(knowledge_id, 1)
        return related
    
    def fuse_from_document(self, document: Dict) -> Dict:
        """从文档融合多模态知识"""
        knowledge_items = []
        
        # 文本内容
        if "text" in document:
            text_knowledge_id = self.register_knowledge(
                knowledge_id=document.get("id", "doc") + "_text",
                content=document["text"],
                modality="text",
                metadata={"source": "document_text"}
            )
            knowledge_items.append(text_knowledge_id)
        
        # 图片/图表
        if "images" in document:
            for idx, img_data in enumerate(document["images"]):
                img_knowledge_id = self.register_knowledge(
                    knowledge_id=f"{document.get('id', 'doc')}_img_{idx}",
                    content=img_data,
                    modality="image",
                    metadata={"source": "document_image"}
                )
                knowledge_items.append(img_knowledge_id)
                
                # 创建图片与相关文本的关联
                if "text" in document:
                    self.create_cross_modal_link(
                        source_id=img_knowledge_id,
                        target_id=document.get("id", "doc") + "_text",
                        link_type="visualizes",
                        confidence=0.9
                    )
        
        # 表格数据
        if "tables" in document:
            for idx, table_data in enumerate(document["tables"]):
                table_knowledge_id = self.register_knowledge(
                    knowledge_id=f"{document.get('id', 'doc')}_table_{idx}",
                    content=table_data,
                    modality="table",
                    metadata={"source": "document_table"}
                )
                knowledge_items.append(table_knowledge_id)
        
        # 音频
        if "audio" in document:
            audio_knowledge_id = self.register_knowledge(
                knowledge_id=f"{document.get('id', 'doc')}_audio",
                content=document["audio"],
                modality="audio",
                metadata={"source": "document_audio"}
            )
            knowledge_items.append(audio_knowledge_id)
        
        return {
            "knowledge_items": knowledge_items,
            "total_items": len(knowledge_items)
        }


class SemanticSearchEngine:
    """语义搜索引擎"""
    
    def __init__(self, embedding_service=None):
        self.embedding_service = embedding_service
        self.index = {}
    
    def index_knowledge(self, knowledge_id: str, content: str, 
                        metadata: Dict = None):
        """索引知识"""
        # 生成文本向量
        if self.embedding_service:
            embedding = self.embedding_service.get_embedding(content)
        else:
            # 简单词袋模型
            embedding = self._simple_embedding(content)
        
        self.index[knowledge_id] = {
            "content": content,
            "embedding": embedding,
            "metadata": metadata or {},
            "indexed_at": datetime.now().isoformat()
        }
        
        logger.info(f"[SemanticSearch] 索引知识: {knowledge_id}")
    
    def search(self, query: str, top_k: int = 10, 
               filters: Dict = None) -> List[Dict]:
        """语义搜索"""
        # 生成查询向量
        if self.embedding_service:
            query_embedding = self.embedding_service.get_embedding(query)
        else:
            query_embedding = self._simple_embedding(query)
        
        # 计算相似度
        results = []
        for kid, item in self.index.items():
            # 应用过滤器
            if filters:
                match = True
                for key, value in filters.items():
                    if item["metadata"].get(key) != value:
                        match = False
                        break
                if not match:
                    continue
            
            # 计算余弦相似度
            similarity = self._cosine_similarity(query_embedding, item["embedding"])
            
            results.append({
                "knowledge_id": kid,
                "content": item["content"][:200] + "...",
                "metadata": item["metadata"],
                "similarity": similarity
            })
        
        # 排序
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        return results[:top_k]
    
    def _simple_embedding(self, text: str) -> np.ndarray:
        """简单词袋 embedding"""
        words = set(re.findall(r'\b\w{2,}\b', text.lower()))
        vec = np.zeros(1000)
        for word in words:
            vec[hash(word) % 1000] += 1
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """余弦相似度"""
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot_product / (norm_a * norm_b))


class KnowledgeGraphExplorer:
    """知识图谱探索器 - 关联扩散"""
    
    def __init__(self, kg_engine):
        self.kg = kg_engine
    
    def explore(self, start_entity_id: str, mode: str = "BreadthFirst",
                max_depth: int = 3, max_nodes: int = 50) -> Dict:
        """
        探索知识网络
        
        参数:
            start_entity_id: 起始实体ID
            mode: 探索模式 (BreadthFirst/DepthFirst/SimilarEntity)
            max_depth: 最大深度
            max_nodes: 最大节点数
        """
        explored = []
        edges = []
        
        if mode == "BreadthFirst":
            explored, edges = self._bfs_explore(start_entity_id, max_depth, max_nodes)
        elif mode == "DepthFirst":
            explored, edges = self._dfs_explore(start_entity_id, max_depth, max_nodes)
        elif mode == "SimilarEntity":
            explored, edges = self._similar_explore(start_entity_id, max_nodes)
        
        return {
            "start_entity": start_entity_id,
            "nodes": explored,
            "edges": edges,
            "total_nodes": len(explored),
            "total_edges": len(edges)
        }
    
    def _bfs_explore(self, start_id: str, max_depth: int, max_nodes: int) -> Tuple[List, List]:
        """广度优先探索"""
        from collections import deque
        
        nodes = []
        edges = []
        visited = {start_id: 0}
        queue = deque([(start_id, 0)])
        
        while queue and len(nodes) < max_nodes:
            current_id, depth = queue.popleft()
            
            if depth > max_depth:
                continue
            
            # 获取实体信息
            entities = self.kg.query_entities(keyword=current_id)
            if entities:
                entity = entities[0]
                nodes.append({
                    "id": entity["entity_id"],
                    "name": entity["name"],
                    "type": entity["entity_type"],
                    "depth": depth
                })
            
            # 获取关联
            relations = self.kg.query_relations(source_id=current_id)
            for rel in relations:
                target_id = rel["target_id"]
                edges.append({
                    "source": current_id,
                    "target": target_id,
                    "type": rel["relation_type"]
                })
                
                if target_id not in visited:
                    visited[target_id] = depth + 1
                    queue.append((target_id, depth + 1))
            
            # 反向关联
            relations = self.kg.query_relations(target_id=current_id)
            for rel in relations:
                source_id = rel["source_id"]
                edges.append({
                    "source": source_id,
                    "target": current_id,
                    "type": rel["relation_type"]
                })
                
                if source_id not in visited:
                    visited[source_id] = depth + 1
                    queue.append((source_id, depth + 1))
        
        return nodes, edges
    
    def _dfs_explore(self, start_id: str, max_depth: int, max_nodes: int) -> Tuple[List, List]:
        """深度优先探索"""
        nodes = []
        edges = []
        visited = set()
        
        def dfs(current_id: str, depth: int):
            if depth > max_depth or len(nodes) >= max_nodes or current_id in visited:
                return
            
            visited.add(current_id)
            
            entities = self.kg.query_entities(keyword=current_id)
            if entities:
                entity = entities[0]
                nodes.append({
                    "id": entity["entity_id"],
                    "name": entity["name"],
                    "type": entity["entity_type"],
                    "depth": depth
                })
            
            relations = self.kg.query_relations(source_id=current_id)
            for rel in relations:
                target_id = rel["target_id"]
                edges.append({
                    "source": current_id,
                    "target": target_id,
                    "type": rel["relation_type"]
                })
                dfs(target_id, depth + 1)
        
        dfs(start_id, 0)
        return nodes, edges
    
    def _similar_explore(self, start_id: str, max_nodes: int) -> Tuple[List, List]:
        """相似实体探索"""
        entities = self.kg.query_entities(keyword=start_id)
        if not entities:
            return [], []
        
        start_entity = entities[0]
        similar_type = start_entity["entity_type"]
        
        similar_entities = self.kg.query_entities(
            entity_type=similar_type, 
            limit=max_nodes
        )
        
        nodes = []
        edges = []
        
        for entity in similar_entities:
            nodes.append({
                "id": entity["entity_id"],
                "name": entity["name"],
                "type": entity["entity_type"],
                "depth": 1
            })
            
            if entity["entity_id"] != start_id:
                edges.append({
                    "source": start_id,
                    "target": entity["entity_id"],
                    "type": "similar_to"
                })
        
        return nodes, edges


class VisualRetrieval:
    """视觉检索 - 以图搜图"""
    
    def __init__(self, embedding_service=None):
        self.embedding_service = embedding_service
        self.image_index = {}
    
    def index_image(self, image_id: str, image_data: Any, 
                    metadata: Dict = None):
        """索引图片"""
        # 生成图像特征向量
        if self.embedding_service:
            embedding = self.embedding_service.get_image_embedding(image_data)
        else:
            # 使用图像元数据作为特征
            embedding = hashlib.md5(str(image_data).encode()).digest()
        
        self.image_index[image_id] = {
            "image_data": image_data,
            "embedding": embedding,
            "metadata": metadata or {},
            "indexed_at": datetime.now().isoformat()
        }
        
        logger.info(f"[VisualRetrieval] 索引图片: {image_id}")
    
    def search_by_image(self, query_image: Any, top_k: int = 5) -> List[Dict]:
        """以图搜图"""
        if self.embedding_service:
            query_embedding = self.embedding_service.get_image_embedding(query_image)
        else:
            query_embedding = hashlib.md5(str(query_image).encode()).digest()
        
        results = []
        
        for img_id, item in self.image_index.items():
            if self.embedding_service:
                similarity = self.embedding_service.compute_similarity(
                    query_embedding, item["embedding"]
                )
            else:
                similarity = 0.5  # 默认相似度
            
            results.append({
                "image_id": img_id,
                "metadata": item["metadata"],
                "similarity": float(similarity)
            })
        
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    
    def search_by_chart(self, chart_type: str, data_pattern: str) -> List[Dict]:
        """按图表类型和数据模式搜索"""
        results = []
        
        for img_id, item in self.image_index.items():
            metadata = item["metadata"]
            
            if metadata.get("chart_type") == chart_type:
                if data_pattern in metadata.get("data_summary", ""):
                    results.append({
                        "image_id": img_id,
                        "metadata": metadata,
                        "match_type": "chart_type"
                    })
        
        return results


class UnifiedRetrieval:
    """统一检索入口 - 支持多模态查询"""
    
    def __init__(self, kg_engine, embedding_service=None):
        self.kg = kg_engine
        self.semantic_search = SemanticSearchEngine(embedding_service)
        self.graph_explorer = KnowledgeGraphExplorer(kg_engine)
        self.visual_retrieval = VisualRetrieval(embedding_service)
        self.fusion = MultiModalKnowledgeFusion(embedding_service)
    
    def retrieve(self, query: str, query_type: str = "semantic",
                 params: Dict = None) -> Dict:
        """
        统一检索接口
        
        参数:
            query: 查询内容
            query_type: 查询类型 (semantic/graph/visual/natural_language)
            params: 额外参数
        """
        params = params or {}
        
        if query_type == "semantic":
            results = self.semantic_search.search(
                query=query,
                top_k=params.get("top_k", 10),
                filters=params.get("filters")
            )
            return {"type": "semantic", "results": results}
        
        elif query_type == "graph":
            results = self.graph_explorer.explore(
                start_entity_id=query,
                mode=params.get("mode", "BreadthFirst"),
                max_depth=params.get("max_depth", 3),
                max_nodes=params.get("max_nodes", 50)
            )
            return {"type": "graph", "results": results}
        
        elif query_type == "visual":
            if params.get("is_image"):
                results = self.visual_retrieval.search_by_image(
                    query_image=query,
                    top_k=params.get("top_k", 5)
                )
            else:
                results = self.visual_retrieval.search_by_chart(
                    chart_type=params.get("chart_type", ""),
                    data_pattern=query
                )
            return {"type": "visual", "results": results}
        
        elif query_type == "natural_language":
            # 自然语言查询 - 解析意图并路由
            return self._natural_language_query(query, params)
        
        else:
            return {"type": "unknown", "results": []}
    
    def _natural_language_query(self, query: str, params: Dict) -> Dict:
        """自然语言查询处理"""
        query_lower = query.lower()
        
        # 检测查询意图
        if any(kw in query_lower for kw in ["找出", "查找", "搜索", "所有", "哪些"]):
            # 检索型查询
            return self.retrieve(query, "semantic", params)
        
        elif any(kw in query_lower for kw in ["关联", "关系", "联系", "相关"]):
            # 图谱探索型查询
            entity = query.split("相关")[-1].split("关联")[-1].split("关系")[-1].strip()
            return self.retrieve(entity, "graph", params)
        
        elif any(kw in query_lower for kw in ["类似", "相似", "像"]):
            # 相似性查询
            entity = query.split("类似")[-1].split("相似")[-1].strip()
            return self.retrieve(entity, "graph", {"mode": "SimilarEntity"})
        
        else:
            # 默认语义搜索
            return self.retrieve(query, "semantic", params)