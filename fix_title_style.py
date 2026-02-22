"""
查找并修复"知识卡片库"标题样式
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找"知识卡片库"标题
import re

# 查找包含"知识卡片库"的行
lines = content.split('\n')
for i, line in enumerate(lines):
    if '知识卡片库' in line:
        print(f"行 {i+1}: {line.strip()}")
        # 显示上下文
        start = max(0, i-5)
        end = min(len(lines), i+10)
        print("上下文:")
        for j in range(start, end):
            marker = ">>> " if j == i else "    "
            print(f"{marker}{j+1}: {lines[j]}", end='')
        print("\n" + "="*50 + "\n")
