import sqlite3
import os

backups = [
    'C:\\test\\antinet\\backend\\data\\antinet.db.before_recovery_20260213_095021',
    'C:\\test\\antinet\\backend\\data\\antinet.db.before_recovery_20260213_094935',
    'C:\\test\\antinet\\data\\antinet.db.backup',
]

for backup_path in backups:
    if os.path.exists(backup_path):
        conn = sqlite3.connect(backup_path)
        cursor = conn.cursor()
        
        total = cursor.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
        feb = cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'").fetchone()[0]
        
        print(f'\n备份: {os.path.basename(backup_path)}')
        print(f'  总卡片: {total}')
        print(f'  2月卡片: {feb}')
        
        if feb > 0:
            print('  2月卡片列表:')
            cards = cursor.execute("SELECT id, title, created_at FROM knowledge_cards WHERE created_at >= '2026-02-01' ORDER BY created_at").fetchall()
            for card in cards:
                print(f'    ID:{card[0]} {card[1][:30]}... ({card[2]})')
        
        conn.close()
    else:
        print(f'\n备份不存在: {backup_path}')
