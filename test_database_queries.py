#!/usr/bin/env python3
"""直接测试数据库查询"""

import sys
from pathlib import Path

# 添加 backend 目录到路径
backend_dir = Path("C:/test/antinet/backend")
sys.path.insert(0, str(backend_dir))

from database import DatabaseManager
from config import settings

def test_database():
    """测试数据库查询"""
    print("初始化数据库管理器...")
    db = DatabaseManager(settings.DB_PATH)
    
    print("\n测试 get_recent_activities...")
    try:
        activities = db.get_recent_activities(10)
        print(f"成功！返回 {len(activities)} 条活动")
        if activities:
            print(f"第一条: {activities[0]}")
    except Exception as e:
        print(f"失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n测试 get_analytics_data...")
    try:
        data = db.get_analytics_data("growth")
        print(f"成功！返回数据: {data}")
    except Exception as e:
        print(f"失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n测试 knowledge_cards 查询...")
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # 测试 stats 查询
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total = cursor.fetchone()[0]
        print(f"总卡片数: {total}")
        
        cursor.execute("SELECT card_type, COUNT(*) as count FROM knowledge_cards GROUP BY card_type")
        by_type = {row[0]: row[1] for row in cursor.fetchall()}
        print(f"按类型分组: {by_type}")
        
        cursor.execute("SELECT category, COUNT(*) as count FROM knowledge_cards GROUP BY category")
        by_category = {row[0]: row[1] for row in cursor.fetchall()}
        print(f"按分类分组: {by_category}")
        
        conn.close()
        print("成功！")
        
    except Exception as e:
        print(f"失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_database()
