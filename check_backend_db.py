import sqlite3
import os

# 检查后端数据库
db_path = 'C:\\test\\antinet\\backend\\data\\antinet.db'

print(f'检查: {db_path}')
print(f'文件存在: {os.path.exists(db_path)}')
print(f'文件大小: {os.path.getsize(db_path) / 1024:.2f} KB')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查表
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print(f'\n表: {[t[0] for t in tables]}')

# 检查卡片
if 'knowledge_cards' in [t[0] for t in tables]:
    total = cursor.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
    print(f'\n总卡片: {total}')
    
    # 检查2月卡片
    feb = cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'").fetchone()[0]
    print(f'2月卡片: {feb}')
    
    # 显示所有卡片
    print('\n所有卡片:')
    cards = cursor.execute("SELECT id, title, created_at FROM knowledge_cards ORDER BY id").fetchall()
    for card in cards:
        date = card[2] if card[2] else 'None'
        print(f'  ID:{card[0]:3} {card[1][:50]:50} ({date})')

conn.close()
