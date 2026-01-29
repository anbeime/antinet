import sqlite3

db_path = "C:/test/antinet/backend/data/antinet.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 测试搜索
query = "四色"
cursor.execute("""
    SELECT id, title, content, category, card_type
    FROM knowledge_cards
    WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
    LIMIT 5
""", (f"%{query}%", f"%{query}%"))

rows = cursor.fetchall()
print(f"Found {len(rows)} cards")
for row in rows:
    print(f"ID: {row[0]}, Title: {row[1]}, Type: {row[4]}")

# 查看所有卡片标题
cursor.execute("SELECT id, title FROM knowledge_cards LIMIT 10")
all_cards = cursor.fetchall()
print("\nFirst 10 cards:")
for card in all_cards:
    print(f"ID: {card[0]}, Title: {card[1]}")

conn.close()
