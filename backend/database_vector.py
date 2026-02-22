"""
数据库向量扩展
为 DatabaseManager 添加向量搜索功能
"""
import sqlite3
import numpy as np
import pickle
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def add_vector_methods(db_manager):
    """
    为 DatabaseManager 添加向量相关方法
    
    Args:
        db_manager: DatabaseManager 实例
    """
    
    def create_vector_table(self):
        """创建向量表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 创建向量表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS card_embeddings (
                    card_id INTEGER PRIMARY KEY,
                    embedding BLOB NOT NULL,
                    embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
                    dimension INTEGER DEFAULT 768,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE
                )
            """)
            
            # 创建索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_card_embeddings_card_id 
                ON card_embeddings(card_id)
            """)
            
            conn.commit()
            logger.info("[Database] 向量表创建成功")
    
    def add_card_embedding(self, card_id: int, embedding: np.ndarray, model: str = 'all-MiniLM-L6-v2'):
        """
        添加或更新卡片向量
        
        Args:
            card_id: 卡片ID
            embedding: 向量数组
            model: 模型名称
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 将向量序列化为 BLOB
            embedding_blob = pickle.dumps(embedding)
            dimension = len(embedding)
            
            # 使用 REPLACE 实现 upsert
            cursor.execute("""
                REPLACE INTO card_embeddings (card_id, embedding, embedding_model, dimension, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (card_id, embedding_blob, model, dimension))
            
            conn.commit()
    
    def get_card_embedding(self, card_id: int) -> Optional[np.ndarray]:
        """
        获取卡片向量
        
        Args:
            card_id: 卡片ID
            
        Returns:
            向量数组，如果不存在返回 None
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT embedding FROM card_embeddings WHERE card_id = ?", (card_id,))
            row = cursor.fetchone()
            
            if row:
                return pickle.loads(row[0])
            return None
    
    def search_similar_cards(self, query_embedding: np.ndarray, limit: int = 10, threshold: float = 0.3) -> List[Dict[str, Any]]:
        """
        向量相似度搜索
        
        Args:
            query_embedding: 查询向量
            limit: 返回数量
            threshold: 相似度阈值 (0-1)
            
        Returns:
            相似卡片列表，包含相似度分数
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # 确保查询向量是一维的
        query_embedding = np.array(query_embedding).flatten()
        logger.debug(f"[DBVector] 查询向量维度: {query_embedding.shape}")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 获取所有卡片和向量
            cursor.execute("""
                SELECT
                    kc.id, kc.title, kc.content, kc.card_type, kc.category, kc.created_at,
                    ce.embedding
                FROM knowledge_cards kc
                INNER JOIN card_embeddings ce ON kc.id = ce.card_id
            """)

            rows = cursor.fetchall()
            logger.debug(f"[DBVector] 从数据库获取 {len(rows)} 条向量记录")

            # 计算相似度
            results = []
            for row in rows:
                card_id, title, content, card_type, category, created_at, embedding_blob = row

                # 反序列化向量
                card_embedding = pickle.loads(embedding_blob)
                card_embedding = np.array(card_embedding).flatten()
                
                # 检查维度
                if len(query_embedding) != len(card_embedding):
                    logger.warning(f"[DBVector] 维度不匹配: 查询{len(query_embedding)} vs 卡片{len(card_embedding)}")
                    continue

                # 计算余弦相似度
                similarity = self._compute_cosine_similarity(query_embedding, card_embedding)
                
                logger.debug(f"[DBVector] 卡片 {card_id} 相似度: {similarity:.4f}")

                # 过滤低相似度
                if similarity >= threshold:
                    results.append({
                        "card_id": f"db_{card_id}",
                        "id": card_id,
                        "title": title,
                        "content": {"description": content},
                        "card_type": card_type if card_type else "blue",
                        "category": category,
                        "similarity": float(similarity),
                        "created_at": created_at
                    })

            # 按相似度排序
            results.sort(key=lambda x: x["similarity"], reverse=True)
            
            logger.debug(f"[DBVector] 返回 {len(results)} 个结果 (阈值: {threshold})")

            return results[:limit]
    
    def _compute_cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """计算余弦相似度"""
        try:
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # 归一化到 [0, 1]
            return (similarity + 1) / 2
            
        except Exception as e:
            logger.error(f"相似度计算失败: {e}")
            return 0.0
    
    def get_embedding_stats(self) -> Dict[str, Any]:
        """获取向量统计信息"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 总卡片数
            cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
            total_cards = cursor.fetchone()[0]
            
            # 已生成向量的卡片数
            cursor.execute("SELECT COUNT(*) FROM card_embeddings")
            embedded_cards = cursor.fetchone()[0]
            
            return {
                "total_cards": total_cards,
                "embedded_cards": embedded_cards,
                "coverage": embedded_cards / total_cards if total_cards > 0 else 0
            }
    
    # 将方法绑定到 DatabaseManager 实例
    import types
    db_manager.create_vector_table = types.MethodType(create_vector_table, db_manager)
    db_manager.add_card_embedding = types.MethodType(add_card_embedding, db_manager)
    db_manager.get_card_embedding = types.MethodType(get_card_embedding, db_manager)
    db_manager.search_similar_cards = types.MethodType(search_similar_cards, db_manager)
    db_manager._compute_cosine_similarity = types.MethodType(_compute_cosine_similarity, db_manager)
    db_manager.get_embedding_stats = types.MethodType(get_embedding_stats, db_manager)
    
    logger.info("[Database] 向量方法已添加")


# 测试代码
if __name__ == "__main__":
    import sys
    sys.path.insert(0, 'C:/test/antinet')
    
    from backend.database import DatabaseManager
    from pathlib import Path
    
    # 初始化数据库
    db = DatabaseManager(Path('C:/test/antinet/backend/data/antinet.db'))
    
    # 添加向量方法
    add_vector_methods(db)
    
    # 创建向量表
    print("Creating vector table...")
    db.create_vector_table()
    
    # 获取统计信息
    stats = db.get_embedding_stats()
    print(f"\nEmbedding Stats:")
    print(f"  Total cards: {stats['total_cards']}")
    print(f"  Embedded cards: {stats['embedded_cards']}")
    print(f"  Coverage: {stats['coverage']:.1%}")
    
    print("\nVector table created successfully!")
