#!/usr/bin/env python3
"""
数据库升级脚本：添加向量搜索支持
"""
import sys
import sqlite3
from pathlib import Path

# 添加项目路径
sys.path.insert(0, 'C:/test/antinet')

DB_PATH = Path('C:/test/antinet/data/antinet.db')
BACKUP_PATH = Path('C:/test/antinet/data/antinet.db.backup')

def backup_database():
    """备份数据库"""
    import shutil
    print(f"📦 备份数据库到: {BACKUP_PATH}")
    shutil.copy(DB_PATH, BACKUP_PATH)
    print("✅ 备份完成")

def upgrade_database():
    """升级数据库结构"""
    print(f"🔧 升动数据库: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. 加载 sqlite-vec 扩展
        print("📥 加载 sqlite-vec 扩展...")
        try:
            conn.enable_load_extension(True)
            # 尝试加载扩展（路径可能需要调整）
            cursor.execute("SELECT load_extension('vec0')")
            print("✅ sqlite-vec 扩展加载成功")
        except Exception as e:
            print(f"⚠️  sqlite-vec 扩展加载失败: {e}")
            print("   将使用普通表存储向量")
        
        # 2. 创建向量表（使用普通表作为后备方案）
        print("📝 创建向量表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS card_embeddings (
                card_id INTEGER PRIMARY KEY,
                embedding BLOB NOT NULL,
                embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE
            )
        """)
        print("✅ 向量表创建成功")
        
        # 3. 创建索引
        print("📝 创建索引...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_card_embeddings_card_id 
            ON card_embeddings(card_id)
        """)
        print("✅ 索引创建成功")
        
        conn.commit()
        print("✅ 数据库升级完成")
        
    except Exception as e:
        print(f"❌ 升级失败: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def verify_upgrade():
    """验证升级结果"""
    print("\n🔍 验证升级结果...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 检查表是否存在
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='card_embeddings'
    """)
    
    if cursor.fetchone():
        print("✅ card_embeddings 表已创建")
        
        # 检查表结构
        cursor.execute("PRAGMA table_info(card_embeddings)")
        columns = cursor.fetchall()
        print(f"   列数: {len(columns)}")
        for col in columns:
            print(f"   - {col[1]} ({col[2]})")
    else:
        print("❌ card_embeddings 表未找到")
    
    conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Antinet 数据库升级工具 - 添加向量搜索支持")
    print("=" * 60)
    print()
    
    # 1. 备份
    backup_database()
    print()
    
    # 2. 升级
    upgrade_database()
    print()
    
    # 3. 验证
    verify_upgrade()
    print()
    
    print("=" * 60)
    print("✅ 升级完成！下一步：运行 generate_embeddings.py 生成向量")
    print("=" * 60)
