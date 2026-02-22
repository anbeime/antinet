"""
查找旧的平铺菜单代码
"""
import re

file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找所有 setActiveTab 调用
matches = re.finditer(r'<button[^>]*>\s*<Presentation[^>]*>\s*<span>PPT生成</span>', content, re.DOTALL)

print("=== 查找 PPT生成 按钮 ===")
for i, match in enumerate(matches, 1):
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 100)
    context = content[start:end]
    print(f"\n匹配 {i}:")
    print(context)
    print("-" * 50)

# 统计 PPT生成 出现次数
ppt_count = content.count('PPT生成')
print(f"\n'PPT生成' 出现次数: {ppt_count}")

# 检查是否在正确的下拉菜单中
if '文档中心' in content and 'PPT生成' in content:
    doc_center_pos = content.find('文档中心')
    ppt_pos = content.find('PPT生成')
    if ppt_pos > doc_center_pos:
        print("✅ PPT生成 在 文档中心 下拉菜单中")
    else:
        print("⚠️  PPT生成 可能在错误的位置")
