import sqlite3
conn = sqlite3.connect('C:/D/zhiyi/backend/data/antinet.db')
cursor = conn.cursor()

# 添加 related_cards 字段（如果不存在）
try:
    cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN related_cards TEXT")
    print("Added related_cards column")
except:
    print("related_cards column already exists")

# 初始化 kg_entities 和 kg_relations
# 从 knowledge_cards 导入到知识图谱
from datetime import datetime

cursor.execute("SELECT id, title, content, card_type FROM knowledge_cards")
cards = cursor.fetchall()

for card in cards:
    card_id, title, content, card_type = card
    entity_id = f"card_{card_id}"
    cursor.execute("""
        INSERT OR IGNORE INTO kg_entities 
        (entity_id, name, entity_type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (entity_id, title, card_type, content[:200] if content else '', datetime.now().isoformat(), datetime.now().isoformat()))

print(f"Imported {len(cards)} cards to kg_entities")

# 检查是否需要关系表
# 先检查现有的关系
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%relation%'")
rels = cursor.fetchall()
print(f"Relation tables: {[r[0] for r in rels]}")

conn.commit()
conn.close()
print("Database updated successfully!")