"""
检查第531行附近的内容
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 显示第520-540行
print("=== 第520-540行 ===")
for i in range(519, min(540, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
