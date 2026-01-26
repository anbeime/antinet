"""
知识导入工具
将解析的知识数据导入到 SQLite 数据库
"""
import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime


class KnowledgeImporter:
    """知识导入器"""

    def __init__(self, db_path: str = "C:/test/antinet/data/antinet.db"):
        """
        初始化知识导入器

        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        self.conn = None

    def connect(self):
        """连接数据库"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()

    def init_tables(self):
        """初始化数据表"""
        cursor = self.conn.cursor()

        # 创建知识卡片表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS knowledge_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT,
                url TEXT,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 创建知识来源表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS knowledge_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL UNIQUE,
                source_type TEXT,
                total_cards INTEGER DEFAULT 0,
                last_imported TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        self.conn.commit()

    def import_cards(self, cards: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        导入知识卡片到数据库

        Args:
            cards: 知识卡片列表

        Returns:
            导入统计信息
        """
        cursor = self.conn.cursor()

        stats = {
            'success': 0,
            'failed': 0,
            'duplicates': 0
        }

        for card in cards:
            try:
                cursor.execute('''
                    INSERT INTO knowledge_cards (type, title, content, source, url, category)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    card.get('type', 'blue'),
                    card.get('title', ''),
                    card.get('content', ''),
                    card.get('source', ''),
                    card.get('url', ''),
                    card.get('category', '未分类')
                ))
                stats['success'] += 1
            except sqlite3.IntegrityError:
                stats['duplicates'] += 1
            except Exception as e:
                stats['failed'] += 1
                print(f" 导入失败: {card.get('title', '')} - {e}")

        self.conn.commit()
        return stats

    def import_from_json(self, json_file: str) -> Dict[str, int]:
        """
        从 JSON 文件导入知识卡片

        Args:
            json_file: JSON 文件路径

        Returns:
            导入统计信息
        """
        with open(json_file, 'r', encoding='utf-8') as f:
            cards = json.load(f)

        return self.import_cards(cards)

    def register_source(self, source_path: str, source_type: str = 'html', total_cards: int = 0):
        """
        注册知识来源

        Args:
            source_path: 来源路径
            source_type: 来源类型（html/json/csv等）
            total_cards: 包含的卡片数量
        """
        cursor = self.conn.cursor()

        cursor.execute('''
            INSERT OR REPLACE INTO knowledge_sources (source_path, source_type, total_cards, last_imported)
            VALUES (?, ?, ?, ?)
        ''', (source_path, source_type, total_cards, datetime.now()))

        self.conn.commit()

    def get_import_stats(self) -> Dict[str, Any]:
        """
        获取导入统计信息

        Returns:
            统计信息字典
        """
        cursor = self.conn.cursor()

        # 总卡片数
        cursor.execute('SELECT COUNT(*) FROM knowledge_cards')
        total_cards = cursor.fetchone()[0]

        # 按类型分组
        cursor.execute('''
            SELECT type, COUNT(*) as count
            FROM knowledge_cards
            GROUP BY type
        ''')
        cards_by_type = {row['type']: row['count'] for row in cursor.fetchall()}

        # 按来源分组
        cursor.execute('SELECT * FROM knowledge_sources')
        sources = [dict(row) for row in cursor.fetchall()]

        return {
            'total_cards': total_cards,
            'cards_by_type': cards_by_type,
            'sources': sources
        }

    def search_cards(self, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        搜索知识卡片

        Args:
            keyword: 搜索关键词
            limit: 返回数量限制

        Returns:
            匹配的卡片列表
        """
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT * FROM knowledge_cards
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (f'%{keyword}%', f'%{keyword}%', limit))

        return [dict(row) for row in cursor.fetchall()]


def main():
    """测试主函数"""
    importer = KnowledgeImporter()

    try:
        # 连接数据库
        importer.connect()
        print("数据库连接成功")

        # 初始化表
        importer.init_tables()
        print("数据表初始化完成")

        # 从 JSON 导入卡片
        json_file = "C:/test/antinet/data/knowledge/knowledge_cards.json"
        if Path(json_file).exists():
            stats = importer.import_from_json(json_file)
            print(f"\n导入统计:")
            print(f"  成功: {stats['success']}")
            print(f"  [WARN] 重复: {stats['duplicates']}")
            print(f" [FAIL] 失败: {stats['failed']}")

            # 注册来源
            importer.register_source(
                source_path="C:/test/antinet/data/html",
                source_type='html',
                total_cards=stats['success']
            )

        # 获取统计信息
        stats = importer.get_import_stats()
        print(f"\n知识库统计:")
        print(f"  总卡片数: {stats['total_cards']}")
        print(f"  按类型分布: {stats['cards_by_type']}")
        print(f"  来源数: {len(stats['sources'])}")

        # 测试搜索
        print(f"\n测试搜索 '股票':")
        results = importer.search_cards('股票', limit=3)
        for card in results:
            print(f"  - {card['title'][:40]}...")

    finally:
        importer.close()
        print("\n完成")


if __name__ == "__main__":
    main()
