"""
测试新创建的卡片是否可以被查询到
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import DatabaseManager
from backend.routes.knowledge_routes import KnowledgeCard
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_create_and_search():
    """测试创建和搜索卡片"""
    from backend.config import settings

    # 初始化数据库
    db = DatabaseManager(settings.DB_PATH)
    conn = db.get_connection()
    cursor = conn.cursor()

    try:
        # 1. 创建测试卡片
        test_card_data = {
            'type': 'blue',
            'title': '测试新卡片',
            'content': '这是一个测试卡片，用于验证新创建的卡片是否可以被查询到',
            'category': '事实'
        }

        logger.info("步骤1: 创建测试卡片...")
        cursor.execute('''
            INSERT INTO knowledge_cards (card_type, title, content, category)
            VALUES (?, ?, ?, ?)
        ''', (
            test_card_data['type'],
            test_card_data['title'],
            test_card_data['content'],
            test_card_data['category']
        ))

        new_card_id = cursor.lastrowid
        conn.commit()
        logger.info(f"✓ 卡片创建成功，ID: {new_card_id}")

        # 2. 验证卡片已插入
        logger.info("\n步骤2: 验证卡片已插入数据库...")
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (new_card_id,))
        card = cursor.fetchone()
        if card:
            logger.info(f"✓ 卡片数据: {dict(card)}")
        else:
            logger.error("✗ 卡片未找到！")
            return False

        # 3. 使用关键词搜索
        logger.info("\n步骤3: 使用关键词搜索卡片...")
        cursor.execute('''
            SELECT id, title, content, card_type, category, created_at
            FROM knowledge_cards
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY id DESC
            LIMIT 5
        ''', ('%测试新卡片%', '%测试新卡片%'))

        results = cursor.fetchall()
        logger.info(f"搜索结果数量: {len(results)}")

        if results:
            for row in results:
                logger.info(f"✓ 找到卡片: ID={row[0]}, 标题={row[1]}")
                if row[0] == new_card_id:
                    logger.info("✓ 新创建的卡片被成功搜索到！")
                    return True
            logger.warning("⚠ 搜索到了卡片，但不是新创建的卡片")
            return False
        else:
            logger.error("✗ 没有搜索到任何卡片！")
            return False

    except Exception as e:
        logger.error(f"测试失败: {e}", exc_info=True)
        return False
    finally:
        conn.close()

def test_database_schema():
    """测试数据库表结构"""
    from backend.config import settings

    db = DatabaseManager(settings.DB_PATH)
    conn = db.get_connection()
    cursor = conn.cursor()

    logger.info("\n=== 检查数据库表结构 ===")
    cursor.execute("PRAGMA table_info(knowledge_cards)")
    columns = cursor.fetchall()

    logger.info("knowledge_cards 表字段:")
    for col in columns:
        logger.info(f"  - {col[1]} ({col[2]})")

    conn.close()

    return columns

if __name__ == "__main__":
    print("=" * 60)
    print("测试新创建的卡片是否可以被查询到")
    print("=" * 60)

    # 检查表结构
    test_database_schema()

    # 测试创建和搜索
    success = test_create_and_search()

    print("\n" + "=" * 60)
    if success:
        print("✓ 测试通过！新创建的卡片可以被正常查询。")
    else:
        print("✗ 测试失败！请检查错误信息。")
    print("=" * 60)

    sys.exit(0 if success else 1)
