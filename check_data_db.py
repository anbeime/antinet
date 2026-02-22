import sqlite3

# 检查 C:\test\antinet\data\antinet.db
db_path = 'C:\\test\\antinet\\data\\antinet.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    total = cursor.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
    feb = cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'").fetchone()[0]
    
    print(f'数据库: {db_path}')
    print(f'总卡片数: {total}')
    print(f'2月份卡片: {feb}')
    
    if feb > 0:
        print('\n2月份卡片列表:')
        cards = cursor.execute("SELECT id, title, created_at FROM knowledge_cards WHERE created_at >= '2026-02-01' ORDER BY created_at").fetchall()
        for card in cards:
            print(f'  ID:{card[0]} {card[1][:40]} ({card[2]})')
    
    conn.close()
except Exception as e:
    print(f'错误: {e}')
