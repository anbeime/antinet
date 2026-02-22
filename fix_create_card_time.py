"""
修复创建卡片的时间问题
"""
file_path = r'C:\test\antinet\backend\routes\knowledge_routes.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找create_card函数中的INSERT语句
import re

# 查找INSERT语句
pattern = r'(INSERT INTO knowledge_cards \(card_type, title, content, category\)\s+VALUES \(\\?, \\?, \\?, \\?\))'

match = re.search(pattern, content)
if match:
    print("找到INSERT语句:")
    print(match.group(1))
    
    # 替换为包含created_at的INSERT
    old_insert = '''INSERT INTO knowledge_cards (card_type, title, content, category)
            VALUES (?, ?, ?, ?)'''
    
    new_insert = '''INSERT INTO knowledge_cards (card_type, title, content, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))'''
    
    if old_insert in content:
        content = content.replace(old_insert, new_insert)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ 已修复INSERT语句，添加created_at和updated_at")
    else:
        print("❌ 未找到旧的INSERT语句")
else:
    print("❌ 未找到INSERT语句")
