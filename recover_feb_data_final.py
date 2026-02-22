import sqlite3
import shutil
from datetime import datetime

# 源数据库(有2月数据)
source_db = 'C:\\test\\antinet\\data\\antinet.db'
# 目标数据库(后端使用)
target_db = 'C:\\test\\antinet\\backend\\data\\antinet.db'

print('=== 最终数据恢复 ===\n')

# 连接两个数据库
conn_source = sqlite3.connect(source_db)
conn_target = sqlite3.connect(target_db)

# 获取2月份卡片
feb_cards = conn_source.execute(
    """SELECT title, content, card_type, category, created_at, updated_at 
       FROM knowledge_cards 
       WHERE created_at >= '2026-02-01'
       ORDER BY id"""
).fetchall()

print(f'📥 发现 {len(feb_cards)} 张2月份卡片需要恢复\n')

# 检查目标数据库是否已有这些卡片
cursor = conn_target.cursor()
existing_titles = set()
for card in feb_cards:
    exists = cursor.execute(
        "SELECT COUNT(*) FROM knowledge_cards WHERE title = ? AND created_at = ?",
        (card[0], card[4])
    ).fetchone()[0]
    if exists:
        existing_titles.add(card[0])

if existing_titles:
    print(f'⚠️  以下卡片已存在，将跳过:')
    for title in existing_titles:
        print(f'   - {title}')
    print()

# 插入卡片
recovered = 0
skipped = 0
failed = 0

for card in feb_cards:
    try:
        title, content, card_type, category, created_at, updated_at = card
        
        # 检查是否已存在
        if title in existing_titles:
            skipped += 1
            print(f'  ⏭️  跳过(已存在): {title}')
            continue
        
        # 插入卡片
        cursor.execute(
            """INSERT INTO knowledge_cards 
               (title, content, card_type, category, similarity, created_at, updated_at)
               VALUES (?, ?, ?, ?, 0.0, ?, ?)""",
            (title, content or '', card_type, category, created_at, updated_at)
        )
        recovered += 1
        print(f'  ✅ 恢复: {title}')
            
    except Exception as e:
        failed += 1
        print(f'  ❌ 失败: {title} - {e}')

conn_target.commit()

# 验证
final_count = cursor.execute("SELECT COUNT(*) FROM knowledge_cards").fetchone()[0]
feb_count = cursor.execute(
    "SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'"
).fetchone()[0]

print(f'\n📊 恢复完成:')
print(f'  ✅ 新增卡片: {recovered} 张')
print(f'  ⏭️  跳过卡片: {skipped} 张')
print(f'  ❌ 失败卡片: {failed} 张')
print(f'  📈 数据库总数: {final_count} 张')
print(f'  📅 2月份卡片: {feb_count} 张')

conn_source.close()
conn_target.close()

print(f'\n✅ 数据恢复完成!')
