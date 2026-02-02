#!/usr/bin/env python3
"""
调试聊天查询API，打印详细的请求和响应
"""
from routes.chat_routes import _search_cards_by_keyword, _generate_response

def test_search_functions():
    """测试搜索和生成回复函数"""
    print("=" * 60)
    print("Debug Chat Functions")
    print("=" * 60)

    # 测试不同的查询
    test_queries = [
        "Antinet系统是什么？",
        "NPU性能",
        "如何启动",
        "四色卡片"
    ]

    for query in test_queries:
        print(f"\nQuery: {query}")
        print("-" * 60)

        # 1. 测试搜索
        print("1. Search results:")
        cards = _search_cards_by_keyword(query, limit=5)
        print(f"   Found {len(cards)} cards")

        if cards:
            for card in cards[:3]:
                print(f"   - {card['title']} ({card['card_type']})")
        else:
            print("   [WARNING] No cards found")

        # 2. 测试生成回复
        print("2. Generate response:")
        response = _generate_response(query, cards)
        print(f"   Response length: {len(response)} chars")
        print(f"   Response preview: {response[:150]}...")

        if "抱歉" in response:
            print("   [WARNING] Got fallback response")
        else:
            print("   [OK] Got structured response")

if __name__ == "__main__":
    test_search_functions()
