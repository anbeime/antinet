import sqlite3

conn = sqlite3.connect('C:\\test\\antinet\\backend\\data\\antinet.db')
cursor = conn.cursor()

total = cursor.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
feb = cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'").fetchone()[0]

print(f'总卡片数: {total}')
print(f'2月份卡片: {feb}')

latest = cursor.execute("SELECT title, created_at FROM knowledge_cards ORDER BY id DESC LIMIT 5").fetchall()
print('\n最新5张:')
for title, created_at in latest:
    print(f'  {title} ({created_at})')

conn.close()
