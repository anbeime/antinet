#!/usr/bin/env python3
import requests
import sys

# Set output encoding to UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def test_query():
    """Test chat query API"""
    API_BASE = "http://localhost:8000"

    print("Testing Chat Query: What is Antinet?")
    print("=" * 50)

    try:
        # 1. Health check
        print("\n1. Health check:")
        resp = requests.get(f"{API_BASE}/api/chat/health")
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")
        print()

        # 2. List cards
        print("2. List cards:")
        resp = requests.get(f"{API_BASE}/api/chat/cards?limit=3")
        data = resp.json()
        print(f"   Total: {data.get('total', 0)}")
        for card in data.get('cards', []):
            print(f"   - {card['title']}")
        print()

        # 3. Chat query
        print("3. Chat query:")
        resp = requests.post(
            f"{API_BASE}/api/chat/query",
            json={"query": "Antinet系统是什么？"}
        )
        print(f"   Status: {resp.status_code}")
        data = resp.json()

        print(f"   Response: {data.get('response', '')[:200]}")
        print(f"   Sources: {len(data.get('sources', []))}")
        for s in data.get('sources', []):
            print(f"   - {s['title']}")

        print("\n" + "=" * 50)
        if data.get('sources'):
            print("SUCCESS: Chatbot is working!")
        else:
            print("WARNING: No sources found")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_query()
