#!/usr/bin/env python3
"""
数据库迁移脚本
创建任务-笔记双向链接表和日历事件表
"""

import sqlite3
from pathlib import Path

# 数据库路径
DB_PATH = Path(__file__).parent / "backend" / "data" / "antinet.db"

def migrate():
    """执行迁移"""
    print(f"正在连接数据库: {DB_PATH}")
    
    if not DB_PATH.exists():
        print(f"错误：数据库文件不存在 {DB_PATH}")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()
    
    print("正在创建任务-笔记双向链接关系表...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS card_task_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            task_id INTEGER NOT NULL,
            relation_type TEXT NOT NULL,
            extract_paragraph TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES gtd_tasks(id) ON DELETE CASCADE,
            UNIQUE(card_id, task_id)
        )
    """)
    
    print("正在创建日历事件表...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            is_all_day BOOLEAN DEFAULT 0,
            location TEXT,
            category TEXT DEFAULT 'default',
            color TEXT,
            source_card_id INTEGER,
            source_paragraph TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY (source_card_id) REFERENCES knowledge_cards(id) ON DELETE SET NULL
        )
    """)
    
    conn.commit()
    
    # 检查表是否创建成功
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('card_task_relations', 'calendar_events')")
    tables = cursor.fetchall()
    print(f"\n已创建的表: {[t[0] for t in tables]}")
    
    if len(tables) == 2:
        print("\n✅ 迁移完成！两个表都创建成功")
    else:
        print(f"\n⚠️ 只创建了 {len(tables)} 个表，请检查")
    
    conn.close()
    return True

if __name__ == "__main__":
    success = migrate()
    exit(0 if success else 1)
