#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向量搜索模块
QNN Embedding + FTS5 全文检索 + 混合搜索 + Reranker
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

# QNN Embedding 缓存（card_id -> numpy embedding）
_qnn_card_embeddings: Dict[str, np.ndarray] = {}
_qnn_embeddings_loaded = False
_qnn_vectors = None  # (N, 1024) matrix of all embeddings
_qnn_doc_ids = []  # alignment with _qnn_vectors

# 配置开关
USE_QNN_EMBEDDING = True
USE_QNN_RERANKER = True  # 启用 QNN Reranker


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


def build_qnn_embedding_index():
    """构建 QNN Embedding 索引（从数据库加载所有卡片）"""
    global _qnn_card_embeddings, _qnn_embeddings_loaded, _qnn_vectors, _qnn_doc_ids

    if db_manager is None:
        logger.warning("[Vector] db_manager 未设置，跳过 QNN 索引构建")
        return

    if not USE_QNN_EMBEDDING:
        return

    try:
        from services.qnn_embedding_service import get_embedding_service
        svc = get_embedding_service()
        if not svc.initialized:
            logger.info("[Vector] 初始化 QNN Embedding 服务...")
            svc.initialize()
    except Exception as e:
        logger.warning(f"[Vector] QNN Embedding 不可用: {e}")
        return

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, content FROM knowledge_cards")
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            logger.info("[Vector] 无卡片数据，跳过 QNN 索引构建")
            return

        embeddings = []
        card_ids = []
        for row in rows:
            card_id = str(row[0])
            title = row[1] or ""
            content = row[2] or ""
            combined = (title + " " + content[:512]).strip()
            if not combined:
                continue
            try:
                emb = svc.encode_text(combined)
                embeddings.append(emb)
                card_ids.append(card_id)
            except Exception as e:
                logger.warning(f"[Vector] 卡片 {card_id} 编码失败: {e}")

        if embeddings:
            _qnn_vectors = np.stack(embeddings)
            _qnn_doc_ids = card_ids
            _qnn_card_embeddings = dict(zip(card_ids, embeddings))
            _qnn_embeddings_loaded = True
            logger.info(f"[Vector] QNN 索引构建完成: {len(card_ids)} 个文档, {_qnn_vectors.shape[1]} 维")

    except Exception as e:
        logger.error(f"[Vector] QNN 索引构建失败: {e}")


def get_embedding(text: str) -> Optional[np.ndarray]:
    """获取文本向量（优先使用 QNN Embedding，回退 TF-IDF）"""
    if USE_QNN_EMBEDDING:
        try:
            from services.qnn_embedding_service import get_embedding_service
            svc = get_embedding_service()
            if not svc.initialized:
                svc.initialize()
            return svc.encode_text(text)
        except Exception as e:
            logger.warning(f"[Vector] QNN Embedding 失败，回退 TF-IDF: {e}")

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


def _search_by_vector_qnn(
    query: str, limit: int = 5
) -> List[VectorSearchResult]:
    """使用 QNN Embedding 进行语义向量搜索"""
    global db_manager

    if not _qnn_embeddings_loaded or _qnn_vectors is None or len(_qnn_doc_ids) == 0:
        return []

    if db_manager is None:
        return []

    query_emb = get_embedding(query)
    if query_emb is None:
        return []

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, content, COALESCE(type, 'blue') as card_type FROM knowledge_cards"
        )
        cards = {str(r[0]): r for r in cursor.fetchall()}
        conn.close()

        norms = np.linalg.norm(_qnn_vectors, axis=1)
        q_norm = np.linalg.norm(query_emb)
        if q_norm == 0:
            return []

        scores = np.dot(_qnn_vectors, query_emb) / (norms * q_norm + 1e-8)

        top_indices = np.argsort(scores)[::-1][:limit * 2]

        results = []
        for idx in top_indices:
            if idx >= len(_qnn_doc_ids):
                continue
            card_id = _qnn_doc_ids[idx]
            if card_id not in cards:
                continue
            row = cards[card_id]
            score = float(scores[idx])
            if score < 0.1:
                score = 0.1
            results.append(VectorSearchResult(
                id=card_id,
                title=row[1] or "",
                content=row[2] or "",
                card_type=row[3],
                score=score
            ))

        if results and len(results) > 1:
            min_s = min(r.score for r in results)
            max_s = max(r.score for r in results)
            for r in results:
                if max_s > min_s:
                    r.score = 0.3 + 0.65 * (r.score - min_s) / (max_s - min_s)
                else:
                    r.score = 0.8

        logger.info(f"[Vector] QNN search: query='{query[:30]}' got {len(results)} results")
        return results[:limit]

    except Exception as e:
        logger.error(f"[Vector] QNN 向量搜索失败: {e}")
        return []


def search_by_vector(
    query: str,
    table: str = "knowledge_cards",
    limit: int = 5,
    threshold: float = 0.05
) -> List[VectorSearchResult]:
    """语义向量搜索（优先 QNN，回退 TF-IDF）"""
    if USE_QNN_EMBEDDING and _qnn_embeddings_loaded:
        qnn_results = _search_by_vector_qnn(query, limit)
        if qnn_results:
            return qnn_results

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
            try:
                idx = _tfidf_doc_ids.index(card_id)
            except ValueError:
                continue

            card_vec = _tfidf_doc_vectors[idx].toarray()[0].astype(np.float32)
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

        if results and len(results) > 1:
            min_s = min(r.score for r in results)
            max_s = max(r.score for r in results)
            for r in results:
                if max_s > min_s:
                    r.score = 0.3 + 0.65 * (r.score - min_s) / (max_s - min_s)
                else:
                    r.score = 0.8

        return results[:limit]

    except Exception as e:
        logger.error(f"[Vector] 向量搜索失败: {e}")
        return fallback_keyword_search(query, limit)


def fts5_search(query: str, limit: int = 10) -> List[VectorSearchResult]:
    """FTS5 全文搜索（替换旧的 LIKE 关键词搜索）"""
    global db_manager
    if db_manager is None:
        return []

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        fts_query = _build_fts5_query(query)
        if not fts_query:
            return _keyword_fallback(query, limit)

        cursor.execute("""
            SELECT kc.id, kc.title, kc.content, COALESCE(kc.card_type, 'blue') as card_type,
                   bm25(knowledge_cards_fts, 0.0, 1.0, 0.0) as score
            FROM knowledge_cards_fts
            JOIN knowledge_cards kc ON kc.id = knowledge_cards_fts.rowid
            WHERE knowledge_cards_fts MATCH ?
            ORDER BY score
            LIMIT ?
        """, (fts_query, limit))

        results = []
        for row in cursor.fetchall():
            score = 1.0 - min(row[4] / 10.0, 0.99)
            results.append(VectorSearchResult(
                id=str(row[0]),
                title=row[1] or "",
                content=row[2] or "",
                card_type=row[3],
                score=max(score, 0.01)
            ))

        conn.close()

        if results:
            min_s = min(r.score for r in results)
            max_s = max(r.score for r in results)
            if max_s > min_s:
                for r in results:
                    r.score = 0.3 + 0.7 * (r.score - min_s) / (max_s - min_s)
            return results
        return _keyword_fallback(query, limit)

    except Exception as e:
        logger.warning(f"[Vector] FTS5 搜索失败: {e}")
        return _keyword_fallback(query, limit)


def _build_fts5_query(query: str) -> str:
    """将用户查询转为 FTS5 查询字符串"""
    query = query.strip()
    if not query:
        return ""

    import jieba
    tokens = [w.strip() for w in jieba.cut(query) if w.strip() and len(w.strip()) > 1]
    if not tokens:
        return ""

    terms = []
    for t in tokens:
        t = t.replace('"', '""')
        terms.append(f'"{t}"')
    return " OR ".join(terms)


def _keyword_fallback(query: str, limit: int = 10) -> List[VectorSearchResult]:
    """关键词搜索最终回退"""
    global db_manager
    if db_manager is None:
        return []

    import jieba
    tokens = [w.strip() for w in jieba.cut(query) if w.strip() and len(w.strip()) > 1]
    if not tokens:
        tokens = [query[:2]]

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        conditions = []
        params = []
        for kw in tokens[:5]:
            conditions.append("(title LIKE ? OR content LIKE ?)")
            params.extend([f"%{kw}%", f"%{kw}%"])

        cursor.execute(f"""
            SELECT id, title, content, COALESCE(card_type, 'blue')
            FROM knowledge_cards
            WHERE {' OR '.join(conditions)}
            LIMIT ?
        """, params + [limit])

        results = []
        for row in cursor.fetchall():
            results.append(VectorSearchResult(
                id=str(row[0]), title=row[1] or "", content=row[2] or "",
                card_type=row[3], score=0.5
            ))
        conn.close()
        return results
    except Exception as e:
        logger.error(f"[Vector] 关键词回退失败: {e}")
        return []


def _rerank_with_qnn(
    query: str, results: List[VectorSearchResult], limit: int = 5
) -> List[VectorSearchResult]:
    """使用 QNN Reranker 对结果重排序"""
    if not USE_QNN_RERANKER or not results:
        return results

    try:
        from services.qnn_reranker_service import get_reranker_service
        svc = get_reranker_service()
        if not svc.initialized:
            svc.initialize()

        scored = []
        for r in results:
            doc_text = (r.title + " " + r.content[:300]).strip()
            score = svc.rerank(query, doc_text)
            scored.append((r, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        logger.info(f"[Vector] Reranked {len(results)} results: scores={[s for _, s in scored]}")

        reranked = []
        for r, score in scored:
            r.score = score
            reranked.append(r)
        return reranked[:limit]

    except Exception as e:
        logger.warning(f"[Vector] Reranker 失败，使用原始排序: {e}")
        return results[:limit]


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
) -> List[VectorSearchResult]:
    """混合搜索：RRF 融合 FTS5 + 向量检索，再用 Reranker 重排序"""
    if _is_keyword_query(query):
        kw_results = fts5_search(query, limit)
        return _rerank_with_qnn(query, kw_results, limit)

    vector_results = search_by_vector(query, limit=limit * 2)
    keyword_results = fts5_search(query, limit=limit * 2)

    if not vector_results and not keyword_results:
        return []

    if not vector_results:
        return _rerank_with_qnn(query, keyword_results[:limit], limit)
    if not keyword_results:
        return _rerank_with_qnn(query, vector_results[:limit], limit)

    # Reciprocal Rank Fusion (RRF)
    K = 60
    fused = {}
    for rank, r in enumerate(vector_results):
        fused[r.id] = {"result": r, "score": 1.0 / (K + rank)}
    for rank, r in enumerate(keyword_results):
        if r.id in fused:
            fused[r.id]["score"] += 1.0 / (K + rank)
        else:
            fused[r.id] = {"result": r, "score": 1.0 / (K + rank)}

    results = [v["result"] for v in sorted(fused.values(), key=lambda x: x["score"], reverse=True)]
    return _rerank_with_qnn(query, results[:limit], limit)


def _precompute_qnn_index_async():
    """异步构建 QNN Embedding 索引"""
    import threading

    def _do():
        try:
            build_qnn_embedding_index()
        except Exception as e:
            logger.error(f"[Vector] QNN 索引构建失败: {e}")

    thread = threading.Thread(target=_do, daemon=True)
    thread.start()
    logger.info("[Vector] QNN 索引构建已在后台启动")


def search_hybrid_raw(query: str, limit: int = 20) -> List[VectorSearchResult]:
    """混合搜索返回原始结果（无 Reranker，供 RAG Pipeline 使用）"""
    vector_results = search_by_vector(query, limit=limit)
    keyword_results = fts5_search(query, limit=limit)

    if not vector_results and not keyword_results:
        return []

    if not vector_results:
        return keyword_results[:limit]
    if not keyword_results:
        return vector_results[:limit]

    K = 60
    fused = {}
    for rank, r in enumerate(vector_results):
        fused[r.id] = {"result": r, "score": 1.0 / (K + rank)}
    for rank, r in enumerate(keyword_results):
        if r.id in fused:
            fused[r.id]["score"] += 1.0 / (K + rank)
        else:
            fused[r.id] = {"result": r, "score": 1.0 / (K + rank)}

    results = [v["result"] for v in sorted(fused.values(), key=lambda x: x["score"], reverse=True)]
    return results[:limit]


def rebuild_fts_index():
    """重建 FTS5 索引（用于迁移已有数据）"""
    global db_manager
    if db_manager is None:
        return
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.executescript("""
            DELETE FROM knowledge_cards_fts;
            INSERT INTO knowledge_cards_fts(rowid, title, content, card_type)
            SELECT id, title, content, COALESCE(card_type, 'blue') FROM knowledge_cards;
        """)
        conn.commit()
        conn.close()
        logger.info("[Vector] FTS5 索引已重建")
    except Exception as e:
        logger.warning(f"[Vector] FTS5 重建失败: {e}")


def init_on_startup():
    """启动时初始化"""
    rebuild_fts_index()
    _precompute_qnn_index_async()
    _precompute_all_embeddings_async()
    logger.info("[Vector] 向量搜索模块初始化完成（QNN + FTS5 + TF-IDF）")


def compute_card_embedding(card_id: str, title: str) -> bool:
    """新增卡片时调用，重建索引"""
    build_tfidf_index()
    build_qnn_embedding_index()
    return True


# 兼容旧导入名称
hybrid_search = search_hybrid


# ==================== FastAPI Router ====================
from fastapi import APIRouter

router = APIRouter(prefix="/api/vector-search", tags=["向量搜索"])


@router.get("/health")
async def vector_search_health():
    """向量搜索健康检查"""
    return {
        "status": "ok",
        "embedding_model": "qnn" if USE_QNN_EMBEDDING and _qnn_embeddings_loaded else "tfidf",
        "cached_embeddings": len(_qnn_doc_ids) if _qnn_embeddings_loaded else (len(_tfidf_doc_ids) if _tfidf_doc_ids else 0),
        "reranker": "qnn" if USE_QNN_RERANKER else "none"
    }


@router.post("/search")
async def vector_search_endpoint(query: str, limit: int = 10):
    """向量搜索接口"""
    results = search_hybrid(query, limit=limit)
    return {"results": [
        {"id": r.id, "title": r.title, "content": r.content, "card_type": r.card_type, "score": r.score}
        for r in results
    ]}