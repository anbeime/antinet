import sqlite3

conn = sqlite3.connect('C:/test/antinet/data/antinet.db')
cursor = conn.cursor()

# 查看所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print('数据库表:', tables)

# 检查 knowledge_cards 表
if 'knowledge_cards' in tables:
    cursor.execute('SELECT COUNT(*) FROM knowledge_cards')
    count = cursor.fetchone()[0]
    print(f'\nknowledge_cards 表中的记录数: {count}')
    
    if count > 0:
        cursor.execute('SELECT * FROM knowledge_cards LIMIT 3')
        print('\n前3条记录:')
        for row in cursor.fetchall():
            print(row)
else:
    print('\n⚠️ knowledge_cards 表不存在！')

conn.close()
