"""
检查实际使用的数据库路径
"""
from config import settings
from pathlib import Path
import os

print("=== 数据库路径检查 ===\n")

print(f"配置中的DB_PATH: {settings.DB_PATH}")
print(f"配置中的DATA_DIR: {settings.DATA_DIR}")
print(f"DB_PATH绝对路径: {settings.DB_PATH.absolute()}")
print(f"DATA_DIR绝对路径: {settings.DATA_DIR.absolute()}")

print(f"\n当前工作目录: {os.getcwd()}")

# 检查文件是否存在
if settings.DB_PATH.exists():
    print(f"\n✅ 数据库文件存在")
    import sqlite3
    conn = sqlite3.connect(str(settings.DB_PATH))
    count = conn.execute('SELECT COUNT(*) FROM knowledge_cards').fetchone()[0]
    print(f"   卡片数量: {count}")
    conn.close()
else:
    print(f"\n❌ 数据库文件不存在")

# 检查其他可能的位置
other_paths = [
    Path("./data/antinet.db"),
    Path("../data/antinet.db"),
    Path("../../data/antinet.db"),
    Path("./backend/data/antinet.db"),
]

print("\n=== 检查其他可能的路径 ===")
for path in other_paths:
    abs_path = path.absolute()
    exists = "✅ 存在" if path.exists() else "❌ 不存在"
    print(f"{exists}: {abs_path}")
