"""
移除知识卡片页面中的导入知识记录按钮
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找知识卡片页面的导入按钮
# 查找包含 "导入知识" 或 "showImportModal" 的按钮
import re

# 查找在 cards tab 中的导入按钮
pattern = r"<button[^>]*>\s*<Upload[^>]*>\s*<span>导入知识.*?</span>\s*</button>"

matches = list(re.finditer(pattern, content, re.DOTALL))
print(f"找到 {len(matches)} 个导入按钮")

for i, match in enumerate(matches):
    print(f"\n匹配 {i+1}:")
    print(match.group()[:200])
    print("...")

# 查找特定的导入按钮（在知识卡片页面）
# 通常是在 activeTab === 'cards' 的代码块中
lines = content.split('\n')
for i, line in enumerate(lines):
    if '导入知识' in line or 'showImportModal' in line:
        print(f"\n行 {i+1}: {line.strip()}")
        # 显示上下文
        start = max(0, i-3)
        end = min(len(lines), i+4)
        for j in range(start, end):
            print(f"  {j+1}: {lines[j]}")
        print()
