"""
聊天路由向量搜索升级补丁
添加向量语义搜索和 RAG 溯源功能
"""
import logging

logger = logging.getLogger(__name__)

# 全局变量
embedding_service = None
VECTOR_SEARCH_ENABLED = False  # 暂时禁用向量搜索


def init_vector_search(chat_routes_module, db_mgr):
    """
    初始化向量搜索功能
    
    Args:
        chat_routes_module: chat_routes 模块
        db_mgr: 数据库管理器
    """
    global embedding_service, VECTOR_SEARCH_ENABLED
    
    # 暂时禁用向量搜索，只用关键词搜索
    logger.warning("[ChatRoutes] 向量搜索已禁用，使用关键词搜索")
    VECTOR_SEARCH_ENABLED = False
    
    # 添加混合搜索函数（只用关键词）
    def _hybrid_search(query: str, limit: int = 10):
        """混合搜索：只用关键词搜索"""
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
    chat_routes_module._hybrid_search = _hybrid_search
    chat_routes_module._generate_response_with_sources = _generate_response_with_sources
    
    logger.info("[ChatRoutes] 关键词搜索功能已启用")
    return True


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
