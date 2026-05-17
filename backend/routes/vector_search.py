#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向量搜索模块
使用 Ollama nomic-embed-text-v2-moe 进行语义搜索
预计算所有卡片embedding，搜索时只计算查询embedding
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import logging
import numpy as np
import os
import json

logger = logging.getLogger(__name__)

db_manager = None
_embedding_model = None
_ollama_available = False

# 预计算的卡片embedding缓存
_card_embeddings: Dict[str, np.ndarray] = {}
_emb_cache_loaded = False


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


def _check_ollama():
    """检查 Ollama 是否可用"""
    global _ollama_available
    try:
        import httpx
        # 不使用代理
        with httpx.Client(timeout=5.0) as client:
            resp = client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                _ollama_available = True
                logger.info("[Vector] Ollama 已连接")
                return True
    except Exception as e:
        logger.warning(f"[Vector] Ollama 不可用: {e}")
    _ollama_available = False
    return False


def _get_embedding_model():
    """获取 Ollama 嵌入模型"""
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model
    
    if not _check_ollama():
        return None
    
    try:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            resp = client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                has_model = any("nomic-embed" in n for n in model_names)
                if has_model:
                    _embedding_model = "nomic-embed-text-v2-moe"
                    logger.info(f"[Vector] Ollama 嵌入模型: {_embedding_model}")
                    return _embedding_model
    except Exception as e:
        logger.warning(f"[Vector] 检查 Ollama 模型失败: {e}")
    
    return None


def _get_cache_path():
    """获取embedding缓存路径"""
    cache_dir = Path(__file__).parent.parent / "data" / "embeddings"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / "card_embeddings.json"


def _load_embeddings_cache():
    """从磁盘加载已缓存的embeddings"""
    global _card_embeddings, _emb_cache_loaded
    if _emb_cache_loaded:
        return
    
    cache_path = _get_cache_path()
    if cache_path.exists():
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for card_id, emb_list in data.items():
                    _card_embeddings[card_id] = np.array(emb_list, dtype=np.float32)
            logger.info(f"[Vector] 加载了 {len(_card_embeddings)} 个缓存embedding")
        except Exception as e:
            logger.warning(f"[Vector] 加载缓存失败: {e}")
    
    _emb_cache_loaded = True


def _save_card_embedding(card_id: str, embedding: np.ndarray):
    """保存单个embedding到缓存"""
    cache_path = _get_cache_path()
    
    try:
        if cache_path.exists():
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {}
    except:
        data = {}
    
    data[card_id] = embedding.tolist()
    
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)


def _get_card_embedding(card_id: str, title: str) -> Optional[np.ndarray]:
    """获取或计算单个卡片的embedding"""
    global _card_embeddings
    
    if card_id in _card_embeddings:
        return _card_embeddings[card_id]
    
    emb = get_embedding(title[:500])
    if emb is not None:
        _card_embeddings[card_id] = emb
        _save_card_embedding(card_id, emb)
    
    return emb


def _precompute_all_embeddings_async():
    """异步预计算所有缺失embedding的卡片（后台运行，不阻塞启动）"""
    import threading
    
    def _do_precompute():
        try:
            _do_precompute_embeddings()
        except Exception as e:
            logger.error(f"[Vector] 预计算失败: {e}")
    
    thread = threading.Thread(target=_do_precompute, daemon=True)
    thread.start()
    logger.info("[Vector] 预计算已在后台启动")


def _do_precompute_embeddings():
    """实际执行预计算逻辑"""
    model = _get_embedding_model()
    if not model or db_manager is None:
        return
    
    # 先加载已缓存的
    _load_embeddings_cache()
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, title FROM knowledge_cards")
        cards = cursor.fetchall()
        
        missing = []
        for row in cards:
            card_id = str(row[0])
            if card_id not in _card_embeddings:
                missing.append((card_id, row[1] or ""))
        
        conn.close()
        
        if missing:
            logger.info(f"[Vector] 预计算 {len(missing)} 个卡片embedding...")
            import httpx
            for card_id, title in missing:
                try:
                    with httpx.Client(timeout=30.0) as client:
                        resp = client.post(
                            "http://localhost:11434/api/embeddings",
                            json={"model": model, "prompt": title[:500]}
                        )
                        if resp.status_code == 200:
                            emb = np.array(resp.json().get("embedding"), dtype=np.float32)
                            _save_card_embedding(card_id, emb)
                            _card_embeddings[card_id] = emb
                except Exception as e:
                    logger.warning(f"[Vector] 预计算失败: {e}")
            
            logger.info(f"[Vector] 预计算完成，共 {len(_card_embeddings)} 个embedding")
        else:
            logger.info(f"[Vector] 所有卡片已有embedding，共 {len(_card_embeddings)} 个")
    
    except Exception as e:
        logger.error(f"[Vector] 预计算失败: {e}")


def compute_and_save_embedding(card_id: str, title: str):
    """新增卡片时调用：计算并保存embedding"""
    emb = _get_card_embedding(card_id, title)
    return emb is not None


def get_embedding(text: str) -> Optional[np.ndarray]:
    """获取文本的 embedding 向量（通过 Ollama）"""
    model = _get_embedding_model()
    if not model:
        return None
    
    try:
        import httpx
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                "http://localhost:11434/api/embeddings",
                json={"model": model, "prompt": text}
            )
            if resp.status_code == 200:
                data = resp.json()
                embedding = data.get("embedding")
                if embedding:
                    return np.array(embedding, dtype=np.float32)
    except Exception as e:
        logger.error(f"[Vector] Ollama Embedding 失败: {e}")
    
    return None


def search_by_vector(
    query: str, 
    table: str = "knowledge_cards",
    limit: int = 5,
    threshold: float = 0.3
) -> List[VectorSearchResult]:
    """语义向量搜索（使用预计算的embedding）"""
    global _card_embeddings
    
    model = _get_embedding_model()
    if not model or not _card_embeddings:
        return fallback_keyword_search(query, limit)
    
    # 只计算查询的embedding
    query_emb = get_embedding(query)
    if query_emb is None:
        return fallback_keyword_search(query, limit)
    
    global db_manager
    if db_manager is None:
        return []
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 获取所有卡片（使用缓存的embedding）
        cursor.execute("SELECT id, title, content, COALESCE(type, 'blue') as card_type FROM knowledge_cards")
        cards = cursor.fetchall()
        
        results = []
        for row in cards:
            card_id = str(row[0])
            if card_id in _card_embeddings:
                # 直接使用缓存的embedding计算相似度
                card_emb = _card_embeddings[card_id]
                score = float(np.dot(query_emb, card_emb))
                if score >= threshold:
                    results.append(VectorSearchResult(
                        id=card_id,
                        title=row[1],
                        content=row[2] or "",
                        card_type=row[3],
                        score=score
                    ))
        
        conn.close()
        
        # 按相似度排序
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
        
    except Exception as e:
        logger.error(f"[Vector] 向量搜索失败: {e}")
        return fallback_keyword_search(query, limit)


def fallback_keyword_search(query: str, limit: int = 5) -> List[VectorSearchResult]:
    """关键词搜索回退方案 - 计算真实相似度"""
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
            SELECT id, title, content, COALESCE(type, 'blue') as card_type
            FROM knowledge_cards
            WHERE {where}
            LIMIT ?
        """, params + [limit * 2])
        
        results = []
        for row in cursor.fetchall():
            # 计算真实的关键词匹配分数
            title = row[1] or ""
            content = row[2] or ""
            match_count = 0
            for kw in keywords:
                if kw.lower() in title.lower():
                    match_count += 2
                if kw.lower() in content.lower():
                    match_count += 1
            
            # 归一化相似度
            score = min(match_count / max(len(keywords) * 2, 1), 1.0)
            
            results.append(VectorSearchResult(
                id=str(row[0]),
                title=title,
                content=content,
                card_type=row[3],
                score=score
            ))
        
        conn.close()
        
        # 按分数排序
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
        
    except Exception as e:
        logger.error(f"[Vector] 关键词搜索失败: {e}")
        return []


def _is_keyword_query(query: str) -> bool:
    """判断是否为关键词查询（应优先关键词搜索）"""
    import re
    # 技术命令模式
    cmd_patterns = [
        r'^git\s+', r'^docker\s+', r'^npm\s+', r'^pnpm\s+', r'^python\s+',
        r'^ls\s+', r'^cd\s+', r'^rm\s+', r'^cp\s+', r'^mv\s+',
        r'^pip\s+', r'^make\s+', r'^cmake\s+', r'^gcc\s+',
    ]
    for p in cmd_patterns:
        if re.search(p, query):
            return True
    
    # 文件路径模式
    if '/' in query and ('.' in query or '\\' in query):
        return True
    
    # 文件扩展名
    if re.search(r'\.(py|js|ts|md|json|yaml|yml|txt|csv|sql)$', query):
        return True
    
    # 技术术语/精确匹配（多个连续大写字母、数字、大括号等）
    if re.search(r'[A-Z]{2,}', query) or re.search(r'v\d+\.\d+', query):
        return True
    
    # 很短的无空格查询
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
    # 短查询直接用关键词（效率高）
    if len(query) < 10:
        return fallback_keyword_search(query, limit)
    
    # 关键词查询优先用关键词搜索
    if _is_keyword_query(query):
        return fallback_keyword_search(query, limit)
    
    # 语义查询（问问题、解释性查询）优先用向量搜索
    vector_results = search_by_vector(query, limit=limit * 2)
    
    if vector_results:
        # 有向量结果，尝试合并关键词结果作为补充
        keyword_results = fallback_keyword_search(query, limit=limit * 2)
        
        result_map = {}
        for r in vector_results:
            result_map[r.id] = r
        
        # 关键词补充
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
        # 无向量结果，回退到关键词
        return fallback_keyword_search(query, limit)


def init_on_startup():
    """启动时初始化"""
    # 加载缓存（快速）
    _load_embeddings_cache()
    
    # 只在有缺失时才后台预计算
    if _card_embeddings:
        logger.info(f"[Vector] 向量搜索模块初始化完成: {_embedding_model or 'N/A'}, {len(_card_embeddings)} 个缓存embedding")
    else:
        logger.info("[Vector] 向量搜索模块初始化完成（仅关键词搜索）")


def compute_card_embedding(card_id: str, title: str) -> bool:
    """新增卡片时调用，计算其embedding"""
    return compute_and_save_embedding(card_id, title)


# ==================== FastAPI Router ====================
# 注意：此模块主要提供函数接口，router 用于占位兼容
from fastapi import APIRouter

router = APIRouter(prefix="/api/vector-search", tags=["向量搜索"])


@router.get("/health")
async def vector_search_health():
    """向量搜索健康检查"""
    return {
        "status": "ok",
        "ollama_available": _ollama_available,
        "embedding_model": _embedding_model,
        "cached_embeddings": len(_card_embeddings)
    }


@router.post("/search")
async def vector_search_endpoint(query: str, limit: int = 10):
    """向量搜索API端点"""
    results = hybrid_search(query, limit=limit)
    return {
        "query": query,
        "results": [
            {
                "id": r.id,
                "title": r.title,
                "content": r.content,
                "card_type": r.card_type,
                "score": r.score
            }
            for r in results
        ],
        "total": len(results)
    }