import sqlite3
from pathlib import Path

# 检查主数据库
print("=== 主数据库 ===")
conn = sqlite3.connect('data/antinet.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(f"表: {tables}")
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    print(f"  {table}: {cursor.fetchone()[0]} 条记录")
conn.close()

# 检查备份
print("\n=== 备份数据库 ===")
backup_path = Path('data/backups/antinet_backup_20260212_112936.db')
if backup_path.exists():
    conn = sqlite3.connect(str(backup_path))
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"表: {tables}")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        print(f"  {table}: {cursor.fetchone()[0]} 条记录")
    conn.close()
