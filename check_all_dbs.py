import sqlite3
import os

# 检查所有数据库文件
db_files = [
    ('C:\\test\\antinet\\backend\\data\\antinet.db', '后端数据库'),
    ('C:\\test\\antinet\\data\\antinet.db', '数据目录'),
    ('C:\\test\\antinet\\backend\\data\\backups\\antinet_backup_20260212_112936.db', '今日备份'),
]

for db_path, name in db_files:
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 检查表是否存在
            tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            table_names = [t[0] for t in tables]
            
            if 'knowledge_cards' in table_names:
                total = cursor.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
                feb = cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'").fetchone()[0]
                
                print(f'\n=== {name} ===')
                print(f'路径: {db_path}')
                print(f'总卡片: {total}')
                print(f'2月卡片: {feb}')
                
                # 显示最新10张
                latest = cursor.execute("SELECT id, title, created_at FROM knowledge_cards ORDER BY id DESC LIMIT 10").fetchall()
                print('最新10张:')
                for card in latest:
                    print(f'  ID:{card[0]} {card[1][:40]} ({card[2]})')
            else:
                print(f'\n=== {name} ===')
                print('knowledge_cards表不存在')
                print(f'现有表: {table_names}')
            
            conn.close()
        except Exception as e:
            print(f'\n=== {name} ===')
            print(f'错误: {e}')
    else:
        print(f'\n=== {name} ===')
        print('文件不存在')
