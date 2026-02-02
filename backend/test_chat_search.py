#!/usr/bin/env python3
"""
测试聊天机器人的搜索功能
"""
from database import DatabaseManager
from pathlib import Path

def test_database_and_search():
    """测试数据库和搜索功能"""
    DB_PATH = Path(__file__).parent.parent / "data" / "antinet.db"

    print("=" * 60)
    print("Chat Search Test")
    print("=" * 60)
    print(f"Database path: {DB_PATH}\n")

    try:
        # 初始化数据库
        db = DatabaseManager(DB_PATH)
        conn = db.get_connection()
        cursor = conn.cursor()

        # 1. 查询所有卡片
        print("1. Query all cards:")
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total = cursor.fetchone()[0]
        print(f"   Total cards: {total}\n")

        # 2. 列出前5张卡片
        print("2. List first 5 cards:")
        cursor.execute("""
            SELECT id, title, card_type, category, created_at
            FROM knowledge_cards
            ORDER BY id ASC
            LIMIT 5
        """)

        for row in cursor.fetchall():
            print(f"   [{row[0]}] {row[1]} ({row[2]} - {row[3]})")
        print()

        # 3. 测试关键词搜索 - "Antinet"
        print("3. Search for keyword 'Antinet':")
        query = "Antinet"
        search_query = """
            SELECT id, title, content, card_type, category
            FROM knowledge_cards
            WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
            ORDER BY id DESC
            LIMIT 10
        """
        params = (f"%{query.lower()}%", f"%{query.lower()}%")

        print(f"   SQL Query: {search_query}")
        print(f"   Params: {params}")

        cursor.execute(search_query, params)
        results = cursor.fetchall()

        print(f"   Found {len(results)} results:")
        for row in results:
            print(f"   - [{row[0]}] {row[1]} ({row[3]} - {row[4]})")
        print()

        # 4. 测试关键词搜索 - "NPU"
        print("4. Search for keyword 'NPU':")
        query = "NPU"
        params = (f"%{query.lower()}%", f"%{query.lower()}%")
        cursor.execute(search_query, params)
        results = cursor.fetchall()

        print(f"   Found {len(results)} results:")
        for row in results:
            print(f"   - [{row[0]}] {row[1]} ({row[3]} - {row[4]})")
        print()

        # 5. 测试关键词搜索 - "启动"
        print("5. Search for keyword '启动':")
        query = "启动"
        params = (f"%{query.lower()}%", f"%{query.lower()}%")
        cursor.execute(search_query, params)
        results = cursor.fetchall()

        print(f"   Found {len(results)} results:")
        for row in results:
            print(f"   - [{row[0]}] {row[1]} ({row[3]} - {row[4]})")
        print()

        # 6. 检查具体某张卡片的内容
        print("6. Check card content (ID=1):")
        cursor.execute("SELECT id, title, content FROM knowledge_cards WHERE id=1")
        row = cursor.fetchone()
        if row:
            print(f"   ID: {row[0]}")
            print(f"   Title: {row[1]}")
            print(f"   Content (first 200 chars): {row[2][:200]}...")
        print()

        conn.close()

        print("=" * 60)
        print("[SUCCESS] Database search test completed")
        print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_and_search()
