"""
太史阁 (Memory)
记忆管理专家，负责知识的存储、检索、更新和关联
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import json
import os

logger = logging.getLogger(__name__)


class MemoryAgent:
    """太史阁"""
    
    def __init__(self, db_path: str = "./data/memory.db"):
        """
        初始化
        
        参数：
            db_path: 数据库路径
        """
        self.db_path = db_path
        self.task_status = "未执行"
        self.log = []
        self._ensure_db_directory()
    
    def _ensure_db_directory(self):
        """确保数据库目录存在"""
        try:
            db_dir = os.path.dirname(self.db_path)
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
                logger.info(f"创建数据库目录: {db_dir}")
        
        except Exception as e:
            logger.error(f"创建数据库目录失败: {e}", exc_info=True)
    
    async def store_knowledge(self, knowledge_type: str, data: Dict) -> Dict:
        """
        存储知识
        
        参数：
            knowledge_type: 知识类型（fact/explanation/risk/action）
            data: 知识数据
        
        返回：
            存储结果
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[太史阁] 开始存储知识: {knowledge_type}")
            
            # 1. 数据验证
            validated_data = self._validate_knowledge(knowledge_type, data)
            self.log.append(f"[太史阁] 数据验证完成")
            
            # 2. 知识索引
            indexed_data = self._index_knowledge(validated_data)
            self.log.append(f"[太史阁] 知识索引完成: {len(indexed_data)}个索引")
            
            # 3. 知识关联
            linked_data = self._link_knowledge(indexed_data, knowledge_type)
            self.log.append(f"[太史阁] 知识关联完成: {len(linked_data.get('relations', []))}个关联")
            
            # 4. 知识存储
            stored_data = self._store_to_db(linked_data, knowledge_type)
            self.log.append(f"[太史阁] 知识存储完成: ID={stored_data.get('id')}")
            
            # 构建输出
            result = {
                "id": stored_data.get("id"),
                "knowledge_type": knowledge_type,
                "indexed": len(indexed_data),
                "relations": len(linked_data.get("relations", [])),
                "stored_at": datetime.now().isoformat(),
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"知识存储完成: {knowledge_type} ID={stored_data.get('id')}")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[太史阁] 存储异常: {str(e)}")
            logger.error(f"知识存储失败: {e}", exc_info=True)
            raise
    
    async def retrieve_knowledge(self, knowledge_type: str, query: str, limit: int = 10) -> Dict:
        """
        检索知识
        
        参数：
            knowledge_type: 知识类型
            query: 查询内容
            limit: 返回数量限制
        
        返回：
            检索结果
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[太史阁] 开始检索知识: {knowledge_type}")
            
            # 1. 查询分析
            analyzed_query = self._analyze_query(query)
            self.log.append(f"[太史阁] 查询分析完成: {analyzed_query}")
            
            # 2. 知识检索
            retrieved_data = self._search_in_db(knowledge_type, analyzed_query, limit)
            self.log.append(f"[太史阁] 知识检索完成: {len(retrieved_data)}条结果")
            
            # 3. 结果排序
            sorted_data = self._sort_results(retrieved_data, query)
            self.log.append(f"[太史阁] 结果排序完成")
            
            # 构建输出
            result = {
                "results": sorted_data,
                "total": len(sorted_data),
                "query": query,
                "retrieved_at": datetime.now().isoformat(),
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"知识检索完成: {len(sorted_data)}条结果")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[太史阁] 检索异常: {str(e)}")
            logger.error(f"知识检索失败: {e}", exc_info=True)
            raise
    
    async def update_knowledge(self, knowledge_id: str, data: Dict) -> Dict:
        """
        更新知识
        
        参数：
            knowledge_id: 知识ID
            data: 更新数据
        
        返回：
            更新结果
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[太史阁] 开始更新知识: {knowledge_id}")
            
            # 1. 数据验证
            validated_data = self._validate_knowledge_update(data)
            self.log.append(f"[太史阁] 数据验证完成")
            
            # 2. 知识更新
            updated_data = self._update_in_db(knowledge_id, validated_data)
            self.log.append(f"[太史阁] 知识更新完成")
            
            # 3. 关联更新
            linked_data = self._update_relations(knowledge_id, validated_data)
            self.log.append(f"[太史阁] 关联更新完成: {len(linked_data.get('relations', []))}个关联")
            
            # 构建输出
            result = {
                "id": knowledge_id,
                "updated": True,
                "relations_updated": len(linked_data.get("relations", [])),
                "updated_at": datetime.now().isoformat(),
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"知识更新完成: {knowledge_id}")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[太史阁] 更新异常: {str(e)}")
            logger.error(f"知识更新失败: {e}", exc_info=True)
            raise
    
    def _validate_knowledge(self, knowledge_type: str, data: Dict) -> Dict:
        """
        验证知识数据
        
        参数：
            knowledge_type: 知识类型
            data: 知识数据
        
        返回：
            验证后数据
        """
        try:
            validated = data.copy()
            
            # 添加时间戳
            validated["created_at"] = datetime.now().isoformat()
            validated["updated_at"] = datetime.now().isoformat()
            
            # 根据类型验证
            if knowledge_type == "fact":
                if not validated.get("title"):
                    raise ValueError("事实必须包含title字段")
                if not validated.get("description"):
                    raise ValueError("事实必须包含description字段")
            
            elif knowledge_type == "explanation":
                if not validated.get("fact_title"):
                    raise ValueError("解释必须关联事实")
                if not validated.get("explanation"):
                    raise ValueError("解释必须包含explanation字段")
            
            elif knowledge_type == "risk":
                if not validated.get("name"):
                    raise ValueError("风险必须包含name字段")
                if not validated.get("description"):
                    raise ValueError("风险必须包含description字段")
            
            elif knowledge_type == "action":
                if not validated.get("title"):
                    raise ValueError("行动建议必须包含title字段")
                if not validated.get("goal"):
                    raise ValueError("行动建议必须包含goal字段")
            
            return validated
        
        except Exception as e:
            logger.error(f"验证知识数据失败: {e}", exc_info=True)
            raise
    
    def _index_knowledge(self, data: Dict) -> Dict:
        """
        索引知识
        
        参数：
            data: 知识数据
        
        返回：
            索引数据
        """
        try:
            indexed = data.copy()
            
            # 提取关键词
            indexed["keywords"] = self._extract_keywords(data)
            
            # 生成向量表示（简化实现）
            indexed["embedding"] = self._generate_embedding(data)
            
            return indexed
        
        except Exception as e:
            logger.error(f"索引知识失败: {e}", exc_info=True)
            return data
    
    def _extract_keywords(self, data: Dict) -> List[str]:
        """
        提取关键词
        
        参数：
            data: 知识数据
        
        返回：
            关键词列表
        """
        try:
            keywords = []
            
            # 从标题提取
            if data.get("title"):
                keywords.extend(data["title"].split())
            
            # 从描述提取
            if data.get("description"):
                keywords.extend(data["description"].split())
            
            # 去重并限制数量
            keywords = list(set(keywords))[:10]
            
            return keywords
        
        except Exception as e:
            logger.error(f"提取关键词失败: {e}", exc_info=True)
            return []
    
    def _generate_embedding(self, data: Dict) -> List[float]:
        """
        生成向量表示（简化实现）
        
        参数：
            data: 知识数据
        
        返回：
            向量表示
        """
        try:
            # 简化实现：基于关键词生成向量
            # TODO: 使用BGE-M3模型生成真实向量
            keywords = data.get("keywords", [])
            
            # 生成固定长度的向量（512维）
            embedding = [0.0] * 512
            
            # 基于关键词哈希填充向量
            for i, keyword in enumerate(keywords):
                idx = hash(keyword) % 512
                embedding[idx] = 1.0
            
            return embedding
        
        except Exception as e:
            logger.error(f"生成向量表示失败: {e}", exc_info=True)
            return [0.0] * 512
    
    def _link_knowledge(self, data: Dict, knowledge_type: str) -> Dict:
        """
        关联知识
        
        参数：
            data: 知识数据
            knowledge_type: 知识类型
        
        返回：
            关联后数据
        """
        try:
            linked = data.copy()
            
            # 初始化关联
            linked["relations"] = []
            
            # 基于类型建立关联
            if knowledge_type == "explanation":
                # 解释关联事实
                fact_title = data.get("fact_title", "")
                linked["relations"].append({
                    "type": "explains",
                    "target_type": "fact",
                    "target_title": fact_title
                })
            
            elif knowledge_type == "risk":
                # 风险关联事实
                if data.get("related_facts"):
                    for fact in data.get("related_facts", []):
                        linked["relations"].append({
                            "type": "detected_from",
                            "target_type": "fact",
                            "target_title": fact
                        })
            
            elif knowledge_type == "action":
                # 行动关联风险和事实
                if data.get("related_risks"):
                    for risk in data.get("related_risks", []):
                        linked["relations"].append({
                            "type": "mitigates",
                            "target_type": "risk",
                            "target_title": risk
                        })
            
            return linked
        
        except Exception as e:
            logger.error(f"关联知识失败: {e}", exc_info=True)
            return data
    
    def _store_to_db(self, data: Dict, knowledge_type: str) -> Dict:
        """
        存储到数据库（简化实现）
        
        参数：
            data: 知识数据
            knowledge_type: 知识类型
        
        返回：
            存储结果
        """
        try:
            # 生成唯一ID
            knowledge_id = f"{knowledge_type}_{datetime.now().timestamp()}"
            
            # 存储到文件（简化实现）
            # TODO: 使用SQLite或向量数据库
            storage_path = self.db_path.replace(".db", f"_{knowledge_type}.json")
            
            # 读取现有数据
            existing_data = []
            if os.path.exists(storage_path):
                with open(storage_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            
            # 添加新数据
            data["id"] = knowledge_id
            existing_data.append(data)
            
            # 写入文件
            with open(storage_path, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)
            
            return {"id": knowledge_id}
        
        except Exception as e:
            logger.error(f"存储到数据库失败: {e}", exc_info=True)
            raise
    
    def _analyze_query(self, query: str) -> Dict:
        """
        分析查询
        
        参数：
            query: 查询内容
        
        返回：
            分析结果
        """
        try:
            # 提取关键词
            keywords = query.split()
            
            return {
                "query": query,
                "keywords": keywords,
                "length": len(query)
            }
        
        except Exception as e:
            logger.error(f"分析查询失败: {e}", exc_info=True)
            return {"query": query, "keywords": [], "length": 0}
    
    def _search_in_db(self, knowledge_type: str, analyzed_query: Dict, limit: int) -> List[Dict]:
        """
        在数据库中检索（简化实现）
        
        参数：
            knowledge_type: 知识类型
            analyzed_query: 分析后的查询
            limit: 返回数量限制
        
        返回：
            检索结果
        """
        try:
            # 从文件读取数据
            storage_path = self.db_path.replace(".db", f"_{knowledge_type}.json")
            
            if not os.path.exists(storage_path):
                return []
            
            with open(storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # 关键词匹配（简化实现）
            # TODO: 使用向量检索
            results = []
            query_keywords = set(analyzed_query.get("keywords", []))
            
            for item in data:
                item_keywords = set(item.get("keywords", []))
                
                # 计算关键词重叠度
                overlap = len(query_keywords & item_keywords)
                if overlap > 0:
                    results.append({
                        **item,
                        "score": overlap / len(query_keywords) if len(query_keywords) > 0 else 0
                    })
            
            # 按分数排序并限制数量
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:limit]
        
        except Exception as e:
            logger.error(f"在数据库中检索失败: {e}", exc_info=True)
            return []
    
    def _sort_results(self, results: List[Dict], query: str) -> List[Dict]:
        """
        排序结果
        
        参数：
            results: 检索结果
            query: 查询内容
        
        返回：
            排序后结果
        """
        try:
            # 已经按分数排序，直接返回
            return results
        
        except Exception as e:
            logger.error(f"排序结果失败: {e}", exc_info=True)
            return results
    
    def _validate_knowledge_update(self, data: Dict) -> Dict:
        """
        验证知识更新数据
        
        参数：
            data: 更新数据
        
        返回：
            验证后数据
        """
        try:
            validated = data.copy()
            
            # 添加更新时间戳
            validated["updated_at"] = datetime.now().isoformat()
            
            return validated
        
        except Exception as e:
            logger.error(f"验证知识更新数据失败: {e}", exc_info=True)
            raise
    
    def _update_in_db(self, knowledge_id: str, data: Dict) -> Dict:
        """
        更新数据库中的知识（简化实现）
        
        参数：
            knowledge_id: 知识ID
            data: 更新数据
        
        返回：
            更新结果
        """
        try:
            # 简化实现：不实现实际更新
            # TODO: 实现数据库更新逻辑
            return {"id": knowledge_id, "updated": True}
        
        except Exception as e:
            logger.error(f"更新数据库中的知识失败: {e}", exc_info=True)
            raise
    
    def _update_relations(self, knowledge_id: str, data: Dict) -> Dict:
        """
        更新关联
        
        参数：
            knowledge_id: 知识ID
            data: 更新数据
        
        返回：
            更新结果
        """
        try:
            # 简化实现：不实现实际更新
            # TODO: 实现关联更新逻辑
            return {"id": knowledge_id, "relations": []}
        
        except Exception as e:
            logger.error(f"更新关联失败: {e}", exc_info=True)
            raise
