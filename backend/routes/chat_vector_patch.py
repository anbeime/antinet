"""
聊天路由向量搜索升级补丁
添加向量语义搜索和 RAG 溯源功能
"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# 全局变量
embedding_service = None
VECTOR_SEARCH_ENABLED = True  # 启用向量搜索


def _vector_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    向量语义搜索
    
    Args:
        query: 查询文本
        limit: 返回结果数量
        
    Returns:
        相关卡片列表
    """
    global embedding_service
    
    if embedding_service is None:
        logger.warning("[ChatRoutes] Embedding service not available, falling back to keyword search")
        return []
    
    try:
        from database import DatabaseManager
        # 这里需要访问数据库管理器来获取卡片并计算相似度
        # 由于我们无法直接访问 db_manager，需要通过其他方式
        
        # 简化实现：返回空列表，让混合搜索回退到关键词搜索
        logger.debug("[ChatRoutes] Vector search placeholder - need db access")
        return []
        
    except Exception as e:
        logger.error(f"[ChatRoutes] Vector search failed: {e}")
        return []


def _hybrid_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    混合搜索：结合向量语义搜索和关键词搜索
    
    Args:
        query: 查询文本
        limit: 返回结果数量
        
    Returns:
        相关卡片列表
    """
    global VECTOR_SEARCH_ENABLED
    
    if not VECTOR_SEARCH_ENABLED:
        logger.warning("[ChatRoutes] 向量搜索已禁用，使用关键词搜索")
        # 这里需要访问原始的关键词搜索函数
        # 但由于模块绑定问题，暂时直接返回空列表
        return []
    
    try:
        # 首先尝试向量搜索
        vector_results = _vector_search(query, limit // 2)
        
        # 然后进行关键词搜索
        # 注意：这里无法直接调用 _search_cards_by_keyword，需要通过模块参数传入
        
        logger.info(f"[ChatRoutes] Hybrid search - vector: {len(vector_results)} results")
        return vector_results
        
    except Exception as e:
        logger.error(f"[ChatRoutes] Hybrid search failed: {e}")
        logger.warning("[ChatRoutes] Falling back to keyword search")
        return []


def init_vector_search(chat_routes_module, db_mgr):
    """
    初始化向量搜索功能
    
    Args:
        chat_routes_module: chat_routes 模块
        db_mgr: 数据库管理器
    """
    global embedding_service, VECTOR_SEARCH_ENABLED
    
    try:
        # 初始化 BGE 嵌入服务
        from embeddings.bge_service import get_embedding_service
        embedding_service = get_embedding_service(use_qnn=False)  # 先使用 CPU 版本
        logger.info("[OK] BGE 嵌入服务初始化成功")
        
        # 设置数据库管理器引用
        chat_routes_module.db_manager = db_mgr
        
        # 重写混合搜索函数以支持数据库访问
        def _hybrid_search_with_db(query: str, limit: int = 10):
            """混合搜索：结合向量语义搜索和关键词搜索"""
            global embedding_service
            
            if embedding_service is None:
                logger.warning("[ChatRoutes] Embedding service not available, using keyword search only")
                return chat_routes_module._search_cards_by_keyword(query, limit=limit)
            
            try:
                # 获取所有卡片用于向量搜索
                conn = db_mgr.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, title, content, card_type, category, created_at
                    FROM knowledge_cards
                    ORDER BY id DESC
                """)
                rows = cursor.fetchall()
                conn.close()
                
                if not rows:
                    return chat_routes_module._search_cards_by_keyword(query, limit=limit)
                
                # 计算查询向量
                query_vector = embedding_service.embed(query)
                
                # 计算相似度
                cards_with_similarity = []
                for row in rows:
                    title = row[1] or ""
                    content = row[2] or ""
                    text_to_embed = f"{title} {content}"
                    
                    try:
                        card_vector = embedding_service.embed(text_to_embed)
                        # 计算余弦相似度
                        similarity = sum(a * b for a, b in zip(query_vector, card_vector))
                        cards_with_similarity.append((similarity, {
                            "card_id": f"db_{row[0]}",
                            "id": row[0],
                            "title": title,
                            "content": {"description": content},
                            "card_type": row[3] if row[3] else "blue",
                            "category": row[4],
                            "similarity": max(0.0, min(1.0, (similarity + 1) / 2))  # 归一化到 [0,1]
                        }))
                    except Exception as e:
                        logger.debug(f"[ChatRoutes] Failed to embed card {row[0]}: {e}")
                        continue
                
                # 按相似度排序
                cards_with_similarity.sort(key=lambda x: x[0], reverse=True)
                vector_results = [card for _, card in cards_with_similarity[:limit//2]]
                
                # 关键词搜索结果
                keyword_results = chat_routes_module._search_cards_by_keyword(query, limit=limit//2)
                
                # 合并结果（去重）
                combined_results = []
                seen_ids = set()
                
                # 优先添加向量搜索结果
                for card in vector_results:
                    card_id = card.get("card_id", "")
                    if card_id not in seen_ids:
                        seen_ids.add(card_id)
                        combined_results.append(card)
                
                # 添加关键词搜索结果
                for card in keyword_results:
                    card_id = card.get("card_id", "")
                    if card_id not in seen_ids:
                        seen_ids.add(card_id)
                        combined_results.append(card)
                
                # 截取到指定数量
                final_results = combined_results[:limit]
                logger.info(f"[ChatRoutes] Hybrid search completed - {len(final_results)} results ({len(vector_results)} vector + {len(keyword_results)} keyword)")
                
                return final_results
                
            except Exception as e:
                logger.error(f"[ChatRoutes] Hybrid search with DB failed: {e}")
                logger.warning("[ChatRoutes] Falling back to keyword search only")
                return chat_routes_module._search_cards_by_keyword(query, limit=limit)
        
        # 生成带来源的回答
        def _generate_response_with_sources(query: str, cards):
            """生成带精确来源的回答"""
            if not cards:
                return {
                    "text": f"抱歉，我没有找到与「{query}」相关的信息。\n\n您可以尝试：\n• 使用不同的关键词\n• 简化您的问题\n• 查看推荐问题获取灵感",
                    "sources": []
                }
            
            response_parts = []
            sources = []
            
            # 开场白
            response_parts.append(f"根据知识库，关于「{query}」的信息如下：\n")
            
            # 生成回答（最多使用前5张卡片）
            for idx, card in enumerate(cards[:5], 1):
                title = card.get("title", "无标题")
                content = card.get("content", {})
                desc = content.get("description", "") if isinstance(content, dict) else content
                card_type = card.get("card_type", "blue")
                
                # 来源标记
                source_id = f"[{idx}]"
                
                # 根据卡片类型添加图标
                icon = {
                    "blue": "📊",
                    "green": "💡",
                    "yellow": "⚠️",
                    "red": "🎯"
                }.get(card_type, "•")
                
                # 添加内容
                response_parts.append(f"{source_id} {icon} **{title}**")
                response_parts.append(f"   {desc[:200]}{'...' if len(desc) > 200 else ''}\n")
                
                # 记录来源
                sources.append({
                    "id": source_id,
                    "card_id": card.get("card_id", ""),
                    "title": title,
                    "excerpt": desc[:100],
                    "card_type": card_type
                })
            
            # 总结
            response_parts.append(f"\n💡 **提示**: 点击来源标记可查看完整卡片内容")
            
            return {
                "text": "\n".join(response_parts),
                "sources": sources
            }
        
        # 将函数绑定到模块
        chat_routes_module._hybrid_search = _hybrid_search_with_db
        chat_routes_module._generate_response_with_sources = _generate_response_with_sources
        
        logger.info("[OK] 向量搜索功能已启用")
        return True
        
    except Exception as e:
        logger.error(f"[Error] BGE嵌入服务初始化失败: {e}")
        VECTOR_SEARCH_ENABLED = False
        logger.warning("[ChatRoutes] 向量搜索初始化失败，使用关键词搜索")
        return False