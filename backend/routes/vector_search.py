#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向量搜索模块
使用 BGE embedding 进行语义搜索
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging
import numpy as np

logger = logging.getLogger(__name__)

db_manager = None
model_loader = None


@dataclass
class VectorSearchResult:
    """向量搜索结果"""
    id: str
    title: str
    content: str
    card_type: str
    score: float


def set_db_manager(manager):
    """设置数据库管理器"""
    global db_manager
    db_manager = manager
    logger.info("[Vector] 数据库管理器已设置")


def init_model():
    """初始化 BGE 模型"""
    global model_loader
    try:
        from models.model_loader import get_model_loader
        # 使用正确的模型key（在 model_loader.py 中定义）
        model_loader = get_model_loader("bge-base-zh")
        logger.info(f"[Vector] 获取模型: {model_loader}")
        logger.info(f"[Vector] is_loaded: {model_loader.is_loaded}")
        logger.info(f"[Vector] model: {model_loader.model}")
        
        # 检查模型是否存在并尝试加载
        if model_loader and model_loader.model is not None:
            model_loader.is_loaded = True
            logger.info("[Vector] BGE 模型已就绪 (已加载)")
            return True
        elif model_loader:
            logger.info("[Vector] 尝试加载BGE模型...")
            try:
                model_loader.load()
                logger.info(f"[Vector] load()后 - model: {model_loader.model}")
                if model_loader.model is not None:
                    model_loader.is_loaded = True
                    logger.info("[Vector] BGE 模型加载成功")
                    return True
            except Exception as load_err:
                import traceback
                logger.warning(f"[Vector] BGE 模型加载失败: {load_err}")
                logger.warning(f"[Vector] 堆栈: {traceback.format_exc()}")
        
        logger.warning("[Vector] BGE 模型不可用，将使用关键词搜索")
        return False
        
    except Exception as e:
        import traceback
        logger.warning(f"[Vector] BGE 模型初始化失败: {e}")
        logger.warning(f"[Vector] 堆栈: {traceback.format_exc()}")
    return False


def get_embedding(text: str) -> Optional[np.ndarray]:
    """获取文本的 embedding 向量"""
    global model_loader
    
    # 尝试初始化（如果还没有）
    if model_loader is None:
        if not init_model():
            return None
    
    # 检查模型是否可用（is_loaded 或 model存在）
    if model_loader is None:
        return None
        
    # 如果is_loaded为False但model存在，也认为可用
    is_available = model_loader.is_loaded or model_loader.model is not None
    if not is_available:
        # 尝试加载
        try:
            model_loader.load()
            is_available = model_loader.model is not None
            if is_available:
                model_loader.is_loaded = True
        except:
            pass
    
    if not is_available:
        return None
    
    try:
        # 使用 BGE 模型生成 embedding
        embedding = model_loader.infer(prompt=text, max_new_tokens=512)
        
        # 解析输出获取 embedding
        if embedding and len(embedding) > 0:
            import json
            try:
                # 尝试解析 JSON 格式输出
                data = json.loads(embedding)
                if isinstance(data, list):
                    return np.array(data)
            except:
                pass
            
            # 回退：简单 token 平均
            tokens = embedding.split()
            if tokens:
                vec = np.zeros(384)
                for i, tok in enumerate(tokens[:384]):
                    vec[i % 384] += hash(tok) % 1000 / 1000.0
                vec = vec / (len(tokens[:384]) + 1e-8)
                return vec
        
        return None
    except Exception as e:
        logger.error(f"[Vector] 生成 embedding 失败: {e}")
        return None


def search_by_vector(
    query: str, 
    table: str = "knowledge_cards",
    limit: int = 5,
    threshold: float = 0.3
) -> List[VectorSearchResult]:
    """
    向量搜索
    如果 BGE 模型不可用，回退到关键词搜索
    """
    global db_manager
    
    embedding = get_embedding(query)
    
    if embedding is None:
        logger.info("[Vector] BGE 不可用，回退到关键词搜索")
        return fallback_keyword_search(query, limit)
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 获取所有卡片（简化版：实际应该预计算并存储向量）
        cursor.execute(f"""
            SELECT id, title, content, COALESCE(type, 'blue') as card_type
            FROM {table}
            ORDER BY COALESCE(similarity, 0.5) DESC
            LIMIT 100
        """)
        
        results = []
        for row in cursor.fetchall():
            card_embedding = get_embedding(row[1] + " " + (row[2] or ""))
            if card_embedding is not None:
                # 计算余弦相似度
                score = np.dot(embedding, card_embedding) / (
                    np.linalg.norm(embedding) * np.linalg.norm(card_embedding) + 1e-8
                )
                if score >= threshold:
                    results.append(VectorSearchResult(
                        id=str(row[0]),
                        title=row[1],
                        content=row[2] or "",
                        card_type=row[3],
                        score=float(score)
                    ))
        
        conn.close()
        
        # 按相似度排序
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
        
    except Exception as e:
        logger.error(f"[Vector] 向量搜索失败: {e}")
        return fallback_keyword_search(query, limit)


def fallback_keyword_search(query: str, limit: int = 5) -> List[VectorSearchResult]:
    """关键词搜索回退方案"""
    import re
    
    global db_manager
    
    if db_manager is None:
        return []
    
    stop_words = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '上', '也', 
                  '很', '到', '说', '要', '去', '你', '会', '看', '好', '这', '那', '什么', '怎么'}
    
    # 提取关键词
    keywords = []
    chinese_chars = re.findall(r'[\u4e00-\u9fff]+', query)
    for segment in chinese_chars:
        filtered = ''.join(c for c in segment if c not in stop_words)
        if len(filtered) >= 2:
            keywords.append(filtered)
            if len(filtered) >= 4:
                for i in range(len(filtered) - 1):
                    bigram = filtered[i:i+2]
                    if bigram not in keywords:
                        keywords.append(bigram)
    
    if not keywords:
        keywords = [query[:4]]
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        conditions = []
        params = []
        for kw in keywords:
            conditions.append("(title LIKE ? OR content LIKE ?)")
            params.extend([f"%{kw}%", f"%{kw}%"])
        
        where = " OR ".join(conditions)
        
        cursor.execute(f"""
            SELECT id, title, content, COALESCE(type, 'blue') as card_type,
                   COALESCE(similarity, 0.5) as sim
            FROM knowledge_cards
            WHERE {where}
            ORDER BY sim DESC
            LIMIT ?
        """, params + [limit])
        
        results = []
        for row in cursor.fetchall():
            results.append(VectorSearchResult(
                id=str(row[0]),
                title=row[1],
                content=row[2] or "",
                card_type=row[3],
                score=float(row[4])
            ))
        
        conn.close()
        return results
        
    except Exception as e:
        logger.error(f"[Vector] 关键词搜索失败: {e}")
        return []


def search_hybrid(
    query: str, 
    limit: int = 5,
    vector_weight: float = 0.6,
    keyword_weight: float = 0.4
) -> List[VectorSearchResult]:
    """
    混合搜索：向量 + 关键词
    结合语义理解和关键词匹配
    """
    # 向量搜索
    vector_results = search_by_vector(query, limit=limit * 2)
    
    # 关键词搜索
    keyword_results = fallback_keyword_search(query, limit=limit * 2)
    
    # 合并结果
    result_map = {}
    
    for r in vector_results:
        if r.id not in result_map:
            result_map[r.id] = r
            result_map[r.id].score = r.score * vector_weight
    
    for r in keyword_results:
        if r.id in result_map:
            result_map[r.id].score += r.score * keyword_weight
        else:
            r.score = r.score * keyword_weight
            result_map[r.id] = r
    
    # 排序并返回
    results = list(result_map.values())
    results.sort(key=lambda x: x.score, reverse=True)
    
    return results[:limit]


def init_on_startup():
    """启动时初始化"""
    logger.info("[Vector] 尝试加载 BGE 模型...")
    init_model()