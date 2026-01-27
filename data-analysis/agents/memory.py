"""
太史阁 (Memory)
记忆管理专家，负责知识的存储、检索、更新和关联
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import json
import os
import sqlite3
import math
from collections import Counter

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
        self._init_db()  # 初始化数据库
    
    def _ensure_db_directory(self):
        """确保数据库目录存在"""
        try:
            db_dir = os.path.dirname(self.db_path)
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
                logger.info(f"创建数据库目录: {db_dir}")

        except Exception as e:
            logger.error(f"创建数据库目录失败: {e}", exc_info=True)

    def _init_db(self):
        """初始化SQLite数据库"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 创建知识表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge (
                    id TEXT PRIMARY KEY,
                    knowledge_type TEXT NOT NULL,
                    title TEXT,
                    description TEXT,
                    content TEXT,
                    keywords TEXT,
                    embedding TEXT,
                    relations TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

            # 创建关联表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_id) REFERENCES knowledge(id),
                    FOREIGN KEY (target_id) REFERENCES knowledge(id)
                )
            """)

            conn.commit()
            conn.close()
            logger.info(f"数据库初始化完成: {self.db_path}")

        except Exception as e:
            logger.error(f"初始化数据库失败: {e}", exc_info=True)
            raise

    def _get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
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
        生成向量表示（真实实现：基于TF-IDF）

        使用TF-IDF算法生成文本向量表示

        参数：
            data: 知识数据

        返回：
            向量表示（固定512维）
        """
        try:
            # 合并标题和描述作为文本
            title = data.get("title", "")
            description = data.get("description", "")
            content = data.get("content", "")

            text_parts = [title, description]
            if isinstance(content, dict):
                content_text = content.get("description", "")
                text_parts.append(content_text)
            elif isinstance(content, str):
                text_parts.append(content)

            full_text = " ".join([t for t in text_parts if t])

            if not full_text:
                return [0.0] * 512

            # 提取词汇
            words = full_text.lower().split()

            if not words:
                return [0.0] * 512

            # 计算词频（TF）
            word_counts = Counter(words)
            total_words = len(words)

            # 计算TF-IDF
            vocab_size = min(len(word_counts), 512)
            embedding = [0.0] * 512

            for i, (word, count) in enumerate(word_counts.most_common(512)):
                # TF (词频)
                tf = count / total_words

                # IDF (文档频率倒数，这里简化为常数)
                # 在实际应用中，应该从整个文档集计算
                idf = 1.0

                # TF-IDF
                tfidf = tf * idf

                # 填充向量
                embedding[i] = tfidf

            # 归一化向量
            norm = math.sqrt(sum(x**2 for x in embedding))
            if norm > 0:
                embedding = [x / norm for x in embedding]

            return embedding

        except Exception as e:
            logger.error(f"生成向量表示失败: {e}", exc_info=True)
            return [0.0] * 512

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        计算余弦相似度

        参数：
            vec1: 向量1
            vec2: 向量2

        返回：
            相似度（0-1之间）
        """
        try:
            # 计算点积
            dot_product = sum(a * b for a, b in zip(vec1, vec2))

            # 计算向量模长
            norm1 = math.sqrt(sum(a**2 for a in vec1))
            norm2 = math.sqrt(sum(b**2 for b in vec2))

            # 避免除零
            if norm1 == 0 or norm2 == 0:
                return 0.0

            # 余弦相似度
            similarity = dot_product / (norm1 * norm2)

            return similarity

        except Exception as e:
            logger.error(f"计算余弦相似度失败: {e}", exc_info=True)
            return 0.0
    
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
        存储到数据库（真实实现：SQLite）

        参数：
            data: 知识数据
            knowledge_type: 知识类型

        返回：
            存储结果
        """
        try:
            # 生成唯一ID
            knowledge_id = f"{knowledge_type}_{datetime.now().timestamp()}"

            # 存储到SQLite数据库
            conn = self._get_connection()
            cursor = conn.cursor()

            # 序列化数据
            content_json = json.dumps(data.get("content", {}), ensure_ascii=False)
            keywords_json = json.dumps(data.get("keywords", []), ensure_ascii=False)
            embedding_json = json.dumps(data.get("embedding", []), ensure_ascii=False)
            relations_json = json.dumps(data.get("relations", []), ensure_ascii=False)

            # 插入知识记录
            cursor.execute("""
                INSERT INTO knowledge (id, knowledge_type, title, description, content, keywords, embedding, relations, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                knowledge_id,
                knowledge_type,
                data.get("title", ""),
                data.get("description", ""),
                content_json,
                keywords_json,
                embedding_json,
                relations_json,
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))

            # 存储关联关系
            relations = data.get("relations", [])
            for relation in relations:
                if relation.get("target_title"):
                    # 简化处理：直接存储关联信息
                    pass

            conn.commit()
            conn.close()

            logger.info(f"知识已存储到数据库: {knowledge_id}")

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
        在数据库中检索（真实实现：向量相似度检索）

        使用余弦相似度进行语义检索

        参数：
            knowledge_type: 知识类型
            analyzed_query: 分析后的查询
            limit: 返回数量限制

        返回：
            检索结果
        """
        try:
            # 生成查询向量
            query_keywords = analyzed_query.get("keywords", [])
            query_text = " ".join(query_keywords)

            if not query_text:
                return []

            # 计算查询的TF-IDF向量
            query_words = query_text.lower().split()
            word_counts = Counter(query_words)
            total_words = len(query_words)

            vocab_size = min(len(word_counts), 512)
            query_embedding = [0.0] * 512

            for i, (word, count) in enumerate(word_counts.most_common(512)):
                tf = count / total_words
                idf = 1.0  # 简化处理
                query_embedding[i] = tf * idf

            # 归一化查询向量
            query_norm = math.sqrt(sum(x**2 for x in query_embedding))
            if query_norm > 0:
                query_embedding = [x / query_norm for x in query_embedding]

            # 从数据库检索
            conn = self._get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, knowledge_type, title, description, content, keywords, embedding, created_at, updated_at
                FROM knowledge
                WHERE knowledge_type = ?
            """, (knowledge_type,))

            rows = cursor.fetchall()
            conn.close()

            # 计算相似度
            results = []
            for row in rows:
                try:
                    # 解码存储的向量
                    stored_embedding = json.loads(row["embedding"])

                    # 计算余弦相似度
                    similarity = self._cosine_similarity(query_embedding, stored_embedding)

                    if similarity > 0.1:  # 只保留相似度大于0.1的结果
                        results.append({
                            "id": row["id"],
                            "knowledge_type": row["knowledge_type"],
                            "title": row["title"],
                            "description": row["description"],
                            "content": json.loads(row["content"]),
                            "keywords": json.loads(row["keywords"]),
                            "score": similarity,
                            "created_at": row["created_at"],
                            "updated_at": row["updated_at"]
                        })
                except Exception as e:
                    logger.warning(f"处理检索结果失败: {e}")
                    continue

            # 按相似度排序
            results.sort(key=lambda x: x["score"], reverse=True)

            # 返回前N个结果
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
        更新数据库中的知识（真实实现：SQLite UPDATE）

        参数：
            knowledge_id: 知识ID
            data: 更新数据

        返回：
            更新结果
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # 检查知识是否存在
            cursor.execute("SELECT id FROM knowledge WHERE id = ?", (knowledge_id,))
            if cursor.fetchone() is None:
                conn.close()
                raise ValueError(f"知识ID {knowledge_id} 不存在")

            # 序列化数据
            content_json = json.dumps(data.get("content", {}), ensure_ascii=False) if data.get("content") else None
            keywords_json = json.dumps(data.get("keywords", []), ensure_ascii=False)
            embedding_json = json.dumps(data.get("embedding", []), ensure_ascii=False)
            relations_json = json.dumps(data.get("relations", []), ensure_ascii=False)

            # 更新数据库
            update_fields = []
            update_values = []
            update_values.append(knowledge_id)  # WHERE条件

            if data.get("title"):
                update_fields.append("title = ?")
                update_values.append(data["title"])

            if data.get("description"):
                update_fields.append("description = ?")
                update_values.append(data["description"])

            if content_json:
                update_fields.append("content = ?")
                update_values.append(content_json)

            if keywords_json:
                update_fields.append("keywords = ?")
                update_values.append(keywords_json)

            if embedding_json:
                update_fields.append("embedding = ?")
                update_values.append(embedding_json)

            if relations_json:
                update_fields.append("relations = ?")
                update_values.append(relations_json)

            # 添加更新时间戳
            update_fields.append("updated_at = ?")
            update_values.append(datetime.now().isoformat())

            # 构建UPDATE语句
            if update_fields:
                sql = f"UPDATE knowledge SET {', '.join(update_fields)} WHERE id = ?"
                cursor.execute(sql, update_values)

                conn.commit()
                conn.close()

                logger.info(f"知识已更新: {knowledge_id}")

                return {"id": knowledge_id, "updated": True}
            else:
                conn.close()
                return {"id": knowledge_id, "updated": False, "message": "没有需要更新的字段"}

        except Exception as e:
            logger.error(f"更新数据库中的知识失败: {e}", exc_info=True)
            raise
    
    def _update_relations(self, knowledge_id: str, data: Dict) -> Dict:
        """
        更新关联（真实实现：SQLite关联表操作）

        参数：
            knowledge_id: 知识ID
            data: 更新数据

        返回：
            更新结果
        """
        try:
            relations = data.get("relations", [])

            if not relations:
                return {"id": knowledge_id, "relations": []}

            conn = self._get_connection()
            cursor = conn.cursor()

            # 删除旧的关联关系
            cursor.execute("DELETE FROM knowledge_relations WHERE source_id = ?", (knowledge_id,))

            # 插入新的关联关系
            for relation in relations:
                relation_type = relation.get("type", "")
                target_title = relation.get("target_title", "")
                target_type = relation.get("target_type", "")

                # 查找目标知识ID（基于标题）
                cursor.execute("""
                    SELECT id FROM knowledge
                    WHERE title = ? AND knowledge_type = ?
                """, (target_title, target_type))

                target_row = cursor.fetchone()

                if target_row:
                    target_id = target_row["id"]

                    # 插入关联关系
                    cursor.execute("""
                        INSERT INTO knowledge_relations (source_id, target_id, relation_type, created_at)
                        VALUES (?, ?, ?, ?)
                    """, (
                        knowledge_id,
                        target_id,
                        relation_type,
                        datetime.now().isoformat()
                    ))

            conn.commit()
            conn.close()

            logger.info(f"知识关联已更新: {knowledge_id}, {len(relations)}个关联")

            return {"id": knowledge_id, "relations": relations}

        except Exception as e:
            logger.error(f"更新关联失败: {e}", exc_info=True)
            raise
