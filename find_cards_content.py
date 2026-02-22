"""
查找知识卡片页面的内容渲染
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找 switch case 或条件渲染
import re

# 查找 activeTab === 'cards' 的代码块
pattern = r"activeTab === 'cards' \? \((.*?)\) :"
matches = re.findall(pattern, content, re.DOTALL)

if matches:
    print("找到 activeTab === 'cards' 渲染代码:")
    for i, match in enumerate(matches):
        print(f"\n匹配 {i+1}:")
        print(match[:500])
        print("...")
else:
    print("未找到匹配")

# 查找 switch 语句中的 cards case
pattern2 = r"case 'cards':\s*return\s*\((.*?)\);"
matches2 = re.findall(pattern2, content, re.DOTALL)

if matches2:
    print("\n找到 case 'cards' 渲染代码:")
    for i, match in enumerate(matches2):
        print(f"\n匹配 {i+1}:")
        print(match[:500])
        print("...")
else:
    print("未找到 case 'cards'")
