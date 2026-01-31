import sqlite3
import sys

# 测试数据库查询
db_path = r"C:\test\antinet\backend\data\antinet.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 测试查询
    query_lower = "antinet"
    cursor.execute("""
        SELECT id, title, content, card_type, category, created_at
        FROM knowledge_cards
        WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
        ORDER BY id DESC
        LIMIT 5
    """, (f"%{query_lower}%", f"%{query_lower}%"))
    
    rows = cursor.fetchall()
    print(f"找到 {len(rows)} 条记录")
    print()
    
    for row in rows:
        print(f"ID: {row[0]}")
        print(f"标题: {row[1]}")
        print(f"内容: {row[2][:100]}...")
        print(f"类型: {row[3]}")
        print(f"分类: {row[4]}")
        print("-" * 50)
    
    conn.close()
    
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
