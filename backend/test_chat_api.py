#!/usr/bin/env python3
"""
测试聊天API的完整流程
"""
import requests
import json

API_BASE = "http://localhost:8000"

def test_chat_query(query: str):
    """测试聊天查询API"""
    print("=" * 60)
    print(f"Testing Chat Query: {query}")
    print("=" * 60)

    try:
        # 1. 测试健康检查
        print("\n1. Health Check:")
        response = requests.get(f"{API_BASE}/api/chat/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        print()

        # 2. 测试列出卡片
        print("2. List Cards:")
        response = requests.get(f"{API_BASE}/api/chat/cards?limit=5")
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Total cards: {data.get('total', 0)}")
        print(f"   Cards:")
        for card in data.get('cards', [])[:3]:
            print(f"     - {card['title']} ({card['card_type']})")
        print()

        # 3. 测试搜索
        print("3. Search Cards:")
        search_data = {"query": query, "limit": 10}
        response = requests.post(
            f"{API_BASE}/api/chat/search",
            json=search_data
        )
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Found: {data.get('total', 0)} cards")
        for card in data.get('cards', [])[:3]:
            print(f"     - {card['title']} ({card['card_type']})")
        print()

        # 4. 测试聊天查询
        print("4. Chat Query:")
        query_data = {"query": query}
        print(f"   Sending: {query_data}")

        response = requests.post(
            f"{API_BASE}/api/chat/query",
            json=query_data
        )

        print(f"   Status: {response.status_code}")
        data = response.json()

        print(f"   Response length: {len(data.get('response', ''))} chars")
        print(f"   Response:")
        print("-" * 60)
        print(data.get('response', ''))
        print("-" * 60)

        print(f"   Sources: {len(data.get('sources', []))}")
        for source in data.get('sources', [])[:3]:
            print(f"     - {source['title']} (similarity: {source['similarity']})")

        print(f"   Suggested questions: {data.get('suggested_questions', [])}")
        print()

        # 5. 检查后端日志（如果有）
        print("5. Analysis:")
        if not data.get('sources'):
            print("   [WARNING] No sources found - search may be failing")
        else:
            print(f"   [OK] Found {len(data.get('sources', []))} relevant cards")

        if "抱歉" in data.get('response', ''):
            print("   [WARNING] Got fallback response - no relevant cards found")
        else:
            print("   [OK] Got structured response")

        print()

    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to backend. Is the server running?")
        print("   Try: cd backend && python main.py")
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Chat API Test Suite")
    print("=" * 60 + "\n")

    # 测试几个不同的查询
    test_queries = [
        "什么是Antinet系统？",
        "NPU的性能如何？",
        "如何启动系统？",
        "四色卡片是什么？"
    ]

    for query in test_queries:
        test_chat_query(query)
        input("\nPress Enter to continue to next test...")
        print()
