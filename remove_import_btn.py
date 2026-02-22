"""
移除知识卡片页面中的导入按钮
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找并移除导入按钮
# 第644行和第672行

# 先查看第635-650行的内容
print("=== 第635-650行 ===")
for i in range(634, min(650, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')

print("\n\n=== 第665-680行 ===")
for i in range(664, min(680, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
