#!/usr/bin/env python3
"""
初始化整合功能数据库表
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "antinet.db"

def init_tables():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. 卡片任务关联表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS card_task_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            task_id INTEGER NOT NULL,
            relation_type TEXT DEFAULT 'derived_from',
            extract_paragraph TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(card_id, task_id)
        )
    """)
    
    # 2. 日历事件表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            is_all_day BOOLEAN DEFAULT 0,
            location TEXT,
            category TEXT DEFAULT 'general',
            color TEXT,
            source_card_id INTEGER,
            source_paragraph TEXT,
            is_completed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_card_id) REFERENCES knowledge_cards(id)
        )
    """)
    
    # 3. 卡片反向链接表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS card_backlinks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_card_id INTEGER NOT NULL,
            target_card_id INTEGER NOT NULL,
            link_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source_card_id, target_card_id),
            FOREIGN KEY (source_card_id) REFERENCES knowledge_cards(id),
            FOREIGN KEY (target_card_id) REFERENCES knowledge_cards(id)
        )
    """)
    
    # 4. 为 knowledge_cards 添加 related_cards 字段（如果不存在）
    try:
        cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN related_cards TEXT")
    except:
        pass  # 字段可能已存在
    
    conn.commit()
    conn.close()
    print("[OK] Integration DB tables initialized")

if __name__ == "__main__":
    init_tables()
