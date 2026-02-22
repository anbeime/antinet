"""
查找导入按钮的上下文
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找第620-640行
print("=== 第620-640行 ===")
for i in range(619, min(640, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
