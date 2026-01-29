import sqlite3

db_path = "C:/test/antinet/backend/data/antinet.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 测试插入
try:
    cursor.execute('''
        INSERT INTO knowledge_cards (card_type, title, content, category)
        VALUES (?, ?, ?, ?)
    ''', ('blue', '测试卡片', '这是测试内容', '事实'))
    
    conn.commit()
    print("SUCCESS - Card inserted!")
    
    # 获取最新的卡片
    cursor.execute("SELECT id, title, card_type FROM knowledge_cards ORDER BY id DESC LIMIT 1")
    card = cursor.fetchone()
    print(f"Latest card: ID={card[0]}, Title={card[1]}, Type={card[2]}")
    
except Exception as e:
    print(f"FAILED - {e}")
    
conn.close()
