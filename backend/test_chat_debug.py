#!/usr/bin/env python3
"""测试聊天功能调试"""
import sys
sys.path.insert(0, '.')

from database import DatabaseManager
from config import settings

db_manager = DatabaseManager(settings.DB_PATH)

def _search_cards_by_keyword(query: str, limit: int = 10):
    """搜索卡片"""
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    query_lower = query.lower()
    cursor.execute("""
        SELECT id, type, title, content, source, category, created_at
        FROM knowledge_cards
        WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
        ORDER BY id DESC
        LIMIT ?
    """, (f"%{query_lower}%", f"%{query_lower}%", limit))

    rows = cursor.fetchall()
    cards = []

    for row in rows:
        card = {
            "card_id": f"db_{row[0]}",
            "id": row[0],
            "card_type": row[1] if row[1] else "blue",
            "title": row[2],
            "content": {
                "description": row[3]
            },
            "source": row[4],
            "category": row[5],
            "similarity": 0.8
        }
        cards.append(card)
        print(f"Card {row[0]}: type={row[1]}, card_type={card['card_type']}, title={row[2]}")

    conn.close()
    return cards

# 测试
print("=" * 60)
print("测试查询: NPU")
print("=" * 60)
cards = _search_cards_by_keyword("NPU", limit=5)
print(f"\n找到 {len(cards)} 张卡片")

if cards:
    print("\n卡片类型统计:")
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]
    green_cards = [c for c in cards if c.get("card_type") == "green"]
    yellow_cards = [c for c in cards if c.get("card_type") == "yellow"]
    red_cards = [c for c in cards if c.get("card_type") == "red"]
    
    print(f"  蓝色 (事实): {len(blue_cards)}")
    print(f"  绿色 (解释): {len(green_cards)}")
    print(f"  黄色 (风险): {len(yellow_cards)}")
    print(f"  红色 (行动): {len(red_cards)}")
    
    if not (blue_cards or green_cards or yellow_cards or red_cards):
        print("\n⚠️ 警告：所有卡片类型过滤后都为空！")
        print("第一张卡片详情:")
        print(cards[0])
