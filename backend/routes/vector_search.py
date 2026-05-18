#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向量搜索模块
使用 TF-IDF 进行语义/关键词混合搜索
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import logging
import numpy as np
import os
import json
import re

logger = logging.getLogger(__name__)

db_manager = None

# 预计算的卡片embedding缓存（TF-IDF 向量）
_card_embeddings: Dict[str, np.ndarray] = {}
_emb_cache_loaded = False

# TF-IDF 相关全局状态
_tfidf_vectorizer = None
_tfidf_doc_vectors = None  # 所有卡片的 TF-IDF 向量 (csr_matrix)
_tfidf_doc_ids = []  # 按顺序存储 card_id


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


def _get_cache_path():
    """获取embedding缓存路径"""
    cache_dir = Path(__file__).parent.parent / "data" / "embeddings"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / "card_embeddings.json"


def _load_embeddings_cache():
    """从磁盘加载已缓存的embeddings（废弃，保留路径兼容）"""
    # 不再从磁盘加载旧版 embedding
    pass


def _save_card_embedding(card_id: str, embedding: np.ndarray):
    """保存单个embedding到缓存（废弃）"""
    pass  # TF-IDF 不需要逐卡保存，统一用 build_tfidf_index


def _build_tfidf_vectorizer() -> Any:
    """构建 TF-IDF 向量器（jieba 词级分词，中文语义更准确）"""
    try:
        import jieba
        from sklearn.feature_extraction.text import TfidfVectorizer

        def tokenize(text: str) -> list:
            """用 jieba 分词，返回词列表"""
            return [w.strip() for w in jieba.cut(text) if w.strip()]

        vectorizer = TfidfVectorizer(
            tokenizer=tokenize,
            token_pattern=None,   # 使用自定义 tokenizer，关闭 sklearn 默认规则
            max_features=8192,
            min_df=1,
            max_df=0.95,
            sublinear_tf=True,
        )
        return vectorizer
    except ImportError as e:
        logger.warning(f"[Vector] jieba 未安装 ({e})，启用关键词搜索")
        return None


def build_tfidf_index():
    """构建 TF-IDF 索引（从数据库加载所有卡片）"""
    global _tfidf_vectorizer, _tfidf_doc_vectors, _tfidf_doc_ids

    if db_manager is None:
        logger.warning("[Vector] db_manager 未设置，跳过 TF-IDF 索引构建")
        return

    vectorizer = _build_tfidf_vectorizer()
    if vectorizer is None:
        return

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, content FROM knowledge_cards")
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            logger.info("[Vector] 无卡片数据，跳过 TF-IDF 索引构建")
            return

        texts = []
        card_ids = []
        for row in rows:
            card_id = str(row[0])
            title = row[1] or ""
            content = row[2] or ""
            # 用标题+内容的前512字符构建文本
            combined = (title + " " + content[:512]).strip()
            texts.append(combined)
            card_ids.append(card_id)

        doc_vectors = vectorizer.fit_transform(texts)
        _tfidf_vectorizer = vectorizer
        _tfidf_doc_vectors = doc_vectors
        _tfidf_doc_ids = card_ids
        _card_embeddings = {cid: None for cid in card_ids}  # 占位

        logger.info(f"[Vector] TF-IDF 索引构建完成: {len(card_ids)} 个文档, {doc_vectors.shape[1]} 维特征")

    except Exception as e:
        logger.error(f"[Vector] TF-IDF 索引构建失败: {e}")


def get_embedding(text: str) -> Optional[np.ndarray]:
    """获取文本的 TF-IDF 向量"""
    if _tfidf_vectorizer is None or _tfidf_doc_vectors is None:
        return None
    try:
        vec = _tfidf_vectorizer.transform([text[:512]])
        return vec.toarray()[0].astype(np.float32)
    except Exception as e:
        logger.error(f"[Vector] TF-IDF 向量生成失败: {e}")
        return None


def _precompute_all_embeddings_async():
    """异步预计算（启动时构建 TF-IDF 索引）"""
    import threading

    def _do():
        try:
            build_tfidf_index()
        except Exception as e:
            logger.error(f"[Vector] TF-IDF 索引构建失败: {e}")

    thread = threading.Thread(target=_do, daemon=True)
    thread.start()
    logger.info("[Vector] TF-IDF 索引构建已在后台启动")


def _do_precompute_embeddings():
    """实际执行预计算逻辑（兼容旧调用）"""
    build_tfidf_index()


def compute_and_save_embedding(card_id: str, title: str):
    """新增卡片时调用：重建 TF-IDF 索引"""
    build_tfidf_index()
    return True


def search_by_vector(
    query: str,
    table: str = "knowledge_cards",
    limit: int = 5,
    threshold: float = 0.05
) -> List[VectorSearchResult]:
    """语义向量搜索（使用 TF-IDF）"""
    if _tfidf_vectorizer is None or _tfidf_doc_vectors is None or len(_tfidf_doc_ids) == 0:
        return fallback_keyword_search(query, limit)

    query_emb = get_embedding(query)
    if query_emb is None:
        return fallback_keyword_search(query, limit)

    global db_manager
    if db_manager is None:
        return []

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, content, COALESCE(type, 'blue') as card_type FROM knowledge_cards"
        )
        cards = cursor.fetchall()
        conn.close()

        results = []
        for row in cards:
            card_id = str(row[0])
            # 找到该卡片在 _tfidf_doc_ids 中的索引
            try:
                idx = _tfidf_doc_ids.index(card_id)
            except ValueError:
                continue

            card_vec = _tfidf_doc_vectors[idx].toarray()[0].astype(np.float32)
            # 计算余弦相似度
            norm_q = np.linalg.norm(query_emb)
            norm_c = np.linalg.norm(card_vec)
            if norm_q > 0 and norm_c > 0:
                score = float(np.dot(query_emb, card_vec) / (norm_q * norm_c))
            else:
                score = 0.0

            if score >= threshold:
                results.append(VectorSearchResult(
                    id=card_id,
                    title=row[1] or "",
                    content=row[2] or "",
                    card_type=row[3],
                    score=score
                ))

        results.sort(key=lambda x: x.score, reverse=True)

        # 调试日志：查看 TF-IDF 原始分数分布
        try:
            top5_raw = []
            for row in cards:
                cid = str(row[0])
                if cid not in _tfidf_doc_ids:
                    continue
                idx = _tfidf_doc_ids.index(cid)
                v = _tfidf_doc_vectors[idx].toarray()[0]
                s = float(np.dot(query_emb, v) / (np.linalg.norm(query_emb) * max(np.linalg.norm(v), 1e-9)))
                top5_raw.append((row[1] or "", s))
            top5_raw.sort(key=lambda x: x[1], reverse=True)
            logger.info(f"[Vector] query='{query[:30]}' TF-IDF top5: {[(t[:15], f'{s:.4f}') for t, s in top5_raw[:5]]}")
        except Exception as e:
            logger.warning(f"[Vector] 调试日志失败: {e}")

        # TF-IDF 原始 cosine 分值偏低，做 min-max 归一化映射到合理显示区间
        # 最低分→0.3，最高分→0.95，保留相对排序
        if results and len(results) > 1:
            min_s = min(r.score for r in results)
            max_s = max(r.score for r in results)
            for r in results:
                if max_s > min_s:
                    r.score = 0.3 + 0.65 * (r.score - min_s) / (max_s - min_s)
                else:
                    r.score = 0.8  # 只有一个结果时给个合理高分

        return results[:limit]

    except Exception as e:
        logger.error(f"[Vector] 向量搜索失败: {e}")
        return fallback_keyword_search(query, limit)


def fallback_keyword_search(query: str, limit: int = 5) -> List[VectorSearchResult]:
    """关键词搜索回退方案"""
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
            SELECT id, title, content, COALESCE(type, 'blue') as card_type
            FROM knowledge_cards
            WHERE {where}
            LIMIT ?
        """, params + [limit * 2])

        results = []
        for row in cursor.fetchall():
            title = row[1] or ""
            content = row[2] or ""
            match_count = 0
            for kw in keywords:
                if kw.lower() in title.lower():
                    match_count += 2
                if kw.lower() in content.lower():
                    match_count += 1

            score = min(match_count / max(len(keywords) * 2, 1), 1.0)

            results.append(VectorSearchResult(
                id=str(row[0]),
                title=title,
                content=content,
                card_type=row[3],
                score=score
            ))

        conn.close()

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]

    except Exception as e:
        logger.error(f"[Vector] 关键词搜索失败: {e}")
        return []


def _is_keyword_query(query: str) -> bool:
    """判断是否为关键词查询（应优先关键词搜索）"""
    # 技术命令模式
    cmd_patterns = [
        r'^git\s+', r'^docker\s+', r'^npm\s+', r'^pnpm\s+', r'^python\s+',
        r'^ls\s+', r'^cd\s+', r'^rm\s+', r'^cp\s+', r'^mv\s+',
        r'^pip\s+', r'^make\s+', r'^cmake\s+', r'^gcc\s+',
    ]
    for p in cmd_patterns:
        if re.search(p, query):
            return True

    if '/' in query and ('.' in query or '\\' in query):
        return True

    if re.search(r'\.(py|js|ts|md|json|yaml|yml|txt|csv|sql)$', query):
        return True

    if re.search(r'[A-Z]{2,}', query) or re.search(r'v\d+\.\d+', query):
        return True

    if len(query) <= 5 and ' ' not in query:
        return True

    return False


def search_hybrid(
    query: str,
    limit: int = 5,
    vector_weight: float = 0.3,
    keyword_weight: float = 0.7
) -> List[VectorSearchResult]:
    """混合搜索：智能判断查询类型，优先使用合适的搜索方式"""
    if len(query) < 10:
        return fallback_keyword_search(query, limit)

    if _is_keyword_query(query):
        return fallback_keyword_search(query, limit)

    vector_results = search_by_vector(query, limit=limit * 2)

    if vector_results:
        keyword_results = fallback_keyword_search(query, limit=limit * 2)

        result_map = {}
        for r in vector_results:
            result_map[r.id] = r

        for r in keyword_results:
            if r.id in result_map:
                existing = result_map[r.id]
                result_map[r.id] = VectorSearchResult(
                    id=r.id, title=r.title, content=r.content,
                    card_type=r.card_type,
                    score=existing.score * 0.7 + r.score * keyword_weight * 0.3
                )
            else:
                result_map[r.id] = VectorSearchResult(
                    id=r.id, title=r.title, content=r.content,
                    card_type=r.card_type,
                    score=r.score * keyword_weight * 0.5
                )

        results = list(result_map.values())
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
    else:
        return fallback_keyword_search(query, limit)


def init_on_startup():
    """启动时初始化"""
    # 立即构建 TF-IDF 索引（后台线程）
    _precompute_all_embeddings_async()
    logger.info("[Vector] 向量搜索模块初始化完成（TF-IDF）")


def compute_card_embedding(card_id: str, title: str) -> bool:
    """新增卡片时调用，重建索引"""
    build_tfidf_index()
    return True


# ==================== FastAPI Router ====================
from fastapi import APIRouter

router = APIRouter(prefix="/api/vector-search", tags=["向量搜索"])


@router.get("/health")
async def vector_search_health():
    """向量搜索健康检查"""
    return {
        "status": "ok",
        "embedding_model": "tfidf",
        "cached_embeddings": len(_tfidf_doc_ids) if _tfidf_doc_ids else 0
    }


@router.post("/search")
async def vector_search_endpoint(query: str, limit: int = 10):
    """向量搜索接口"""
    results = search_hybrid(query, limit=limit)
    return {"results": [
        {"id": r.id, "title": r.title, "content": r.content, "card_type": r.card_type, "score": r.score}
        for r in results
    ]}