import sqlite3
import shutil
from datetime import datetime

# 源数据库 (data目录，有测试导入的卡片)
source_db = 'C:\\test\\antinet\\data\\antinet.db'
# 目标数据库 (后端使用)
target_db = 'C:\\test\\antinet\\backend\\data\\antinet.db'

print('=== 合并数据库（修复版）===\n')

# 备份目标数据库
backup_path = f'C:\\test\\antinet\\backend\\data\\antinet.db.before_merge_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
shutil.copy2(target_db, backup_path)
print(f'✅ 已备份目标数据库: {backup_path}\n')

# 连接数据库
conn_source = sqlite3.connect(source_db)
conn_target = sqlite3.connect(target_db)

# 获取源数据库中的所有卡片
source_cards = conn_source.execute(
    """SELECT id, title, content, card_type, category, created_at, updated_at 
       FROM knowledge_cards 
       ORDER BY id"""
).fetchall()

print(f'📊 源数据库 (data\\antinet.db): {len(source_cards)} 张卡片')

# 获取目标数据库中的现有卡片（用于去重）
target_titles = set()
target_cards = conn_target.execute("SELECT title FROM knowledge_cards").fetchall()
for card in target_cards:
    target_titles.add(card[0].lower().strip())

print(f'📊 目标数据库 (backend\\data\\antinet.db): {len(target_cards)} 张卡片')

# 合并卡片
print(f'\n📥 开始合并...\n')
cursor = conn_target.cursor()
imported = 0
skipped = 0
failed = 0

# 有效的category值
valid_categories = ['事实', '解释', '风险', '行动']

for card in source_cards:
    try:
        id, title, content, card_type, category, created_at, updated_at = card
        
        # 检查是否已存在（根据标题）
        if title.lower().strip() in target_titles:
            skipped += 1
            print(f'  ⏭️  跳过(已存在): {title[:50]}')
            continue
        
        # 修复category（如果不是有效值，设置为默认值）
        if category not in valid_categories:
            # 根据card_type推断category
            category_map = {
                'blue': '事实',
                'green': '解释', 
                'yellow': '风险',
                'red': '行动'
            }
            category = category_map.get(card_type, '事实')
        
        # 插入卡片
        cursor.execute(
            """INSERT INTO knowledge_cards 
               (title, content, card_type, category, similarity, created_at, updated_at)
               VALUES (?, ?, ?, ?, 0.0, ?, ?)""",
            (title, content or '', card_type, category, 
             created_at or datetime.now().isoformat(), 
             updated_at or datetime.now().isoformat())
        )
        imported += 1
        print(f'  ✅ 导入: {title[:50]}')
        
    except Exception as e:
        failed += 1
        print(f'  ❌ 失败: {title[:50]} - {e}')

conn_target.commit()

# 验证结果
final_count = cursor.execute("SELECT COUNT(*) FROM knowledge_cards").fetchone()[0]
feb_count = cursor.execute(
    "SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= '2026-02-01'"
).fetchone()[0]

print(f'\n📊 合并完成:')
print(f'  ✅ 新增卡片: {imported} 张')
print(f'  ⏭️  跳过卡片: {skipped} 张')
print(f'  ❌ 失败卡片: {failed} 张')
print(f'  📈 数据库总数: {final_count} 张')
print(f'  📅 2月份卡片: {feb_count} 张')

conn_source.close()
conn_target.close()

print(f'\n✅ 数据库合并完成!')
print(f'💾 备份文件: {backup_path}')
