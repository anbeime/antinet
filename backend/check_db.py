import sqlite3
conn = sqlite3.connect('data/antinet.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", [row[0] for row in cursor.fetchall()])
cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
print("Cards:", cursor.fetchone()[0])
conn.close()
