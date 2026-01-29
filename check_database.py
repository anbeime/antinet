#!/usr/bin/env python3
"""检查数据库表结构"""

import sqlite3
from pathlib import Path

DB_PATH = Path("C:/test/antinet/backend/data/antinet.db")

def check_database():
    """检查数据库表结构"""
    if not DB_PATH.exists():
        print(f"数据库不存在: {DB_PATH}")
        return
    
    print(f"检查数据库: {DB_PATH}")
    print("=" * 80)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 获取所有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print(f"\n数据库包含 {len(tables)} 个表:")
    for table in tables:
        table_name = table[0]
        print(f"\n表: {table_name}")
        
        # 获取表结构
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        print("  列:")
        for col in columns:
            print(f"    - {col[1]} ({col[2]})")
        
        # 获取行数
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  行数: {count}")
        
        # 显示前3行数据
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            print(f"  示例数据 (前3行):")
            for row in rows:
                print(f"    {row}")
    
    conn.close()
    print("\n" + "=" * 80)


if __name__ == "__main__":
    check_database()
