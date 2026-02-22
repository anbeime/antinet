"""
检查导入知识记录按钮的位置
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找导入按钮的行号
for i, line in enumerate(lines):
    if '导入知识记录' in line:
        # 显示上下文
        print(f"=== 第 {i+1} 行 ===")
        start = max(0, i-10)
        end = min(len(lines), i+5)
        for j in range(start, end):
            marker = ">>> " if j == i else "    "
            print(f"{marker}{j+1}: {lines[j]}", end='')
        print()
