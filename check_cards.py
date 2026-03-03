import sqlite3
conn = sqlite3.connect('C:/test/antinet/backend/data/antinet.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM knowledge_cards')
count = cursor.fetchone()[0]
print('¿¨Æ¬×ÜÊý:', count)
conn.close()
