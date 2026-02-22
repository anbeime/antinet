"""
检查所有后端文件使用的数据库路径
"""
import os
import re

backend_dir = 'C:\\test\\antinet\\backend'

# 需要检查的模式
patterns = [
    r'DB_PATH\s*=\s*["\'](.+?)["\']',
    r'Path\(["\'](.+?antinet\.db)["\']\)',
    r'sqlite3\.connect\(["\'](.+?)["\']\)',
    r'DatabaseManager\(["\'](.+?)["\']\)',
    r'["\'](.+?antinet\.db)["\']',
]

results = {}

for root, dirs, files in os.walk(backend_dir):
    # 跳过 __pycache__
    if '__pycache__' in root:
        continue
        
    for file in files:
        if not file.endswith('.py'):
            continue
            
        file_path = os.path.join(root, file)
        rel_path = os.path.relpath(file_path, backend_dir)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # 检查是否包含数据库相关代码
            if 'antinet.db' in content or 'DB_PATH' in content or 'DatabaseManager' in content or 'sqlite3.connect' in content:
                # 提取数据库路径
                db_paths = []
                for pattern in patterns:
                    matches = re.findall(pattern, content)
                    db_paths.extend(matches)
                
                # 去重
                db_paths = list(set(db_paths))
                
                if db_paths:
                    results[rel_path] = db_paths
        except:
            pass

print("=== 数据库使用情况检查 ===\n")
print(f"发现 {len(results)} 个文件使用数据库:\n")

for file_path, db_paths in sorted(results.items()):
    print(f"📄 {file_path}")
    for db_path in db_paths:
        # 规范化路径
        if db_path.startswith('./'):
            db_path = db_path[2:]
        if db_path.startswith('data/'):
            db_path = f"backend/{db_path}"
        print(f"   → {db_path}")
    print()

# 统计
backend_db_count = 0
data_db_count = 0

for db_paths in results.values():
    for db_path in db_paths:
        if 'backend' in db_path or db_path.startswith('data/antinet.db'):
            backend_db_count += 1
        if db_path.startswith('data/') and 'backend' not in db_path:
            data_db_count += 1

print("=== 统计 ===")
print(f"使用 backend/data/antinet.db: {backend_db_count} 处")
print(f"使用 data/antinet.db: {data_db_count} 处")
