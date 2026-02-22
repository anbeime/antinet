"""
查找activeTab的条件渲染
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找 {activeTab === 'xxx' && 或 {activeTab === 'xxx' ?
for i, line in enumerate(lines):
    if 'activeTab' in line and ('&&' in line or '?' in line):
        print(f"行 {i+1}: {line.strip()[:100]}")
