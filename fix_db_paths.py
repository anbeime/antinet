"""
修复所有后端文件的数据库路径，统一使用 backend/data/antinet.db
"""
import os
import re

backend_dir = 'C:\\test\\antinet\\backend'

# 需要修复的文件列表
files_to_fix = [
    'tools/import_knowledge_batch.py',
    'tools/knowledge_importer.py',
    'scripts/generate_embeddings.py',
    'scripts/upgrade_database.py',
    'routes/chat_vector_patch.py',
    'database_vector.py',
]

# 旧路径模式 -> 新路径
replacements = [
    (r"C:/test/antinet/data/antinet.db", r"C:/test/antinet/backend/data/antinet.db"),
    (r'C:\\\\test\\\\antinet\\\\data\\\\antinet.db', r'C:\\\\test\\\\antinet\\\\backend\\\\data\\\\antinet.db'),
]

fixed_files = []

for rel_path in files_to_fix:
    file_path = os.path.join(backend_dir, rel_path)
    
    if not os.path.exists(file_path):
        print(f"⚠️  文件不存在: {rel_path}")
        continue
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 应用替换
        for old_pattern, new_pattern in replacements:
            content = content.replace(old_pattern, new_pattern)
        
        # 检查是否有变化
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed_files.append(rel_path)
            print(f"✅ 已修复: {rel_path}")
        else:
            print(f"⏭️  无需修复: {rel_path}")
            
    except Exception as e:
        print(f"❌ 修复失败 {rel_path}: {e}")

print(f"\n=== 修复完成 ===")
print(f"共修复 {len(fixed_files)} 个文件")
if fixed_files:
    print("修复的文件列表:")
    for f in fixed_files:
        print(f"  - {f}")
