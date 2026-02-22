"""
修复 config.py 的数据库路径
"""
file_path = r'C:\test\antinet\backend\config.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 替换路径
old_path = 'DB_PATH: Path = Path("./data/antinet.db")'
new_path = 'DB_PATH: Path = Path("./backend/data/antinet.db")'

if old_path in content:
    content = content.replace(old_path, new_path)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ 已修复 config.py")
else:
    print("⚠️  未找到需要修复的内容")
    # 显示当前内容
    import re
    match = re.search(r'DB_PATH: Path = Path\(["\'](.+?)["\']\)', content)
    if match:
        print(f"当前路径: {match.group(1)}")
