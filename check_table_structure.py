import sqlite3

db_path = "C:/test/antinet/backend/data/antinet.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 获取表结构
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='knowledge_cards'")
result = cursor.fetchone()
print("Table structure:")
print(result[0])

conn.close()
