"""
聊天路由向量搜索升级补丁
添加向量语义搜索和 RAG 溯源功能
"""
import logging

logger = logging.getLogger(__name__)

# 全局变量
embedding_service = None


def init_vector_search(chat_routes_module, db_mgr):
    """
    初始化向量搜索功能
    
    Args:
        chat_routes_module: chat_routes 模块
        db_mgr: 数据库管理器
    """
    global embedding_service
    
    try:
        # 1. 导入 BGE 嵌入服务
        from embeddings.bge_service import get_embedding_service
        embedding_service = get_embedding_service(use_qnn=True)
        logger.info("[ChatRoutes] BGE 嵌入服务已初始化")
        
        # 2. 添加向量方法到数据库
        from database_vector import add_vector_methods
        add_vector_methods(db_mgr)
        logger.info("[ChatRoutes] 数据库向量方法已添加")
        
        # 3. 创建向量表（如果不存在）
        db_mgr.create_vector_table()
        logger.info("[ChatRoutes] 向量表已创建/确认")
        
        # 3. 添加向量搜索函数
        def _search_cards_by_vector(query: str, limit: int = 10):
            """使用向量相似度搜索"""
            try:
                # 生成查询向量
                query_embedding = embedding_service.encode_text(query)
                logger.debug(f"[VectorSearch] 查询向量维度: {len(query_embedding)}, 前5个值: {query_embedding[:5]}")
                
                # 先获取向量统计
                stats = db_mgr.get_embedding_stats()
                logger.debug(f"[VectorSearch] 数据库向量统计: {stats}")
                
                # 向量搜索
                results = db_mgr.search_similar_cards(
                    query_embedding,
                    limit=limit,
                    threshold=0.1  # 降低阈值以便调试
                )
                
                logger.info(f"[VectorSearch] 查询: '{query}', 找到 {len(results)} 个结果")
                if results:
                    logger.debug(f"[VectorSearch] 最高相似度: {results[0].get('similarity', 0):.4f}")
                return results
                
            except Exception as e:
                logger.error(f"[VectorSearch] 向量搜索失败: {e}", exc_info=True)
                return []
        
        # 4. 混合搜索函数（向量 + 关键词）
        def _hybrid_search(query: str, limit: int = 10):
            """混合搜索：向量搜索 + 关键词搜索"""
            # 向量搜索
            vector_cards = _search_cards_by_vector(query, limit=limit)
            
            # 关键词搜索
            keyword_cards = chat_routes_module._search_cards_by_keyword(query, limit=limit)
            
            # 合并去重
            seen_ids = set()
            merged_cards = []
            
            # 优先使用向量搜索结果
            for card in vector_cards:
                card_id = card.get('id')
                if card_id not in seen_ids:
                    seen_ids.add(card_id)
                    merged_cards.append(card)
            
            # 补充关键词搜索结果
            for card in keyword_cards:
                card_id = card.get('id')
                if card_id not in seen_ids and len(merged_cards) < limit:
                    seen_ids.add(card_id)
                    # 关键词搜索的卡片相似度设为 0.6
                    card['similarity'] = 0.6
                    merged_cards.append(card)
            
            logger.info(f"[HybridSearch] 向量: {len(vector_cards)}, 关键词: {len(keyword_cards)}, 合并: {len(merged_cards)}")
            return merged_cards
        
        # 5. 生成带来源的回答
        def _generate_response_with_sources(query: str, cards):
            """生成带精确来源的回答"""
            if not cards:
                return {
                    "text": f"抱歉，我没有找到与「{query}」相关的信息。\n\n您可以尝试：\n• 使用不同的关键词\n• 简化您的问题\n• 查看推荐问题获取灵感",
                    "sources": []
                }
            
            response_parts = []
            sources = []
            
            # 按相似度排序
            sorted_cards = sorted(cards, key=lambda x: x.get("similarity", 0), reverse=True)
            
            # 开场白
            response_parts.append(f"根据知识库，关于「{query}」的信息如下：\n")
            
            # 生成回答（最多使用前5张卡片）
            for idx, card in enumerate(sorted_cards[:5], 1):
                title = card.get("title", "无标题")
                content = card.get("content", {})
                desc = content.get("description", "") if isinstance(content, dict) else content
                card_type = card.get("card_type", "blue")
                similarity = card.get("similarity", 0)
                
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
                response_parts.append(f"   {desc[:200]}{'...' if len(desc) > 200 else ''}")
                response_parts.append(f"   _相似度: {similarity:.1%}_\n")
                
                # 记录来源
                sources.append({
                    "id": source_id,
                    "card_id": card.get("card_id", ""),
                    "title": title,
                    "excerpt": desc[:100],
                    "similarity": float(similarity),
                    "card_type": card_type
                })
            
            # 总结
            response_parts.append(f"\n💡 **提示**: 点击来源标记可查看完整卡片内容")
            
            return {
                "text": "\n".join(response_parts),
                "sources": sources
            }
        
        # 6. 将函数绑定到模块
        chat_routes_module._search_cards_by_vector = _search_cards_by_vector
        chat_routes_module._hybrid_search = _hybrid_search
        chat_routes_module._generate_response_with_sources = _generate_response_with_sources
        
        logger.info("[ChatRoutes] 向量搜索功能已启用")
        return True
        
    except Exception as e:
        logger.error(f"[ChatRoutes] 向量搜索初始化失败: {e}", exc_info=True)
        return False


# 使用示例
if __name__ == "__main__":
    import sys
    sys.path.insert(0, 'C:/test/antinet/backend')
    
    from database import DatabaseManager
    from pathlib import Path
    import routes.chat_routes as chat_routes
    
    # 初始化数据库
    db = DatabaseManager(Path('C:/test/antinet/backend/data/antinet.db'))
    chat_routes.db_manager = db
    
    # 初始化向量搜索
    success = init_vector_search(chat_routes, db)
    
    if success:
        print("✓ Vector search initialized")
        
        # 测试混合搜索
        results = chat_routes._hybrid_search("Antinet系统功能", limit=5)
        print(f"\nFound {len(results)} results:")
        for card in results:
            print(f"  - {card['title']} (similarity: {card['similarity']:.3f})")
        
        # 测试生成回答
        response = chat_routes._generate_response_with_sources("Antinet系统功能", results)
        print(f"\nResponse:\n{response['text']}")
        print(f"\nSources: {len(response['sources'])}")
    else:
        print("✗ Vector search initialization failed")
