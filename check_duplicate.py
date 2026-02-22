"""
检查是否有重复的菜单代码
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找所有菜单相关的内容
import re

# 查找所有 "hidden md:flex" 出现的位置
matches = list(re.finditer(r'hidden md:flex items-center space-x', content))

print(f"找到 {len(matches)} 处菜单容器")

for i, match in enumerate(matches):
    start = match.start()
    # 获取上下文
    context_start = max(0, start - 50)
    context_end = min(len(content), start + 100)
    context = content[context_start:context_end]
    print(f"\n=== 菜单 {i+1} ===")
    print(context)
    print("-" * 50)
