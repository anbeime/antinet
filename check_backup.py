import sqlite3
import os

# 检查备份文件
backup_path = 'C:\\test\\antinet\\backend\\data\\antinet.db.before_recovery_20260213_095021'

if os.path.exists(backup_path):
    conn = sqlite3.connect(backup_path)
    cursor = conn.cursor()
    
    total = cursor.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
    feb = cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'").fetchone()[0]
    
    print(f'备份文件: {backup_path}')
    print(f'总卡片数: {total}')
    print(f'2月份卡片: {feb}')
    
    if feb > 0:
        print('\n2月份卡片列表:')
        cards = cursor.execute("SELECT id, title, created_at FROM knowledge_cards WHERE created_at >= '2026-02-01' ORDER BY created_at").fetchall()
        for card in cards:
            print(f'  ID:{card[0]} {card[1]} ({card[2]})')
    
    conn.close()
else:
    print('备份文件不存在')
