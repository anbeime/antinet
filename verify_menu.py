"""
验证菜单修改是否正确
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 检查关键特征
checks = {
    '下拉菜单': 'relative group' in content,
    '知识管理': '知识管理' in content,
    '文档中心': '文档中心' in content,
    'AI工具': 'AI工具' in content,
    'ChevronDown': 'ChevronDown' in content,
    'group-hover': 'group-hover' in content,
}

print("=== 菜单验证 ===\n")
for name, result in checks.items():
    status = "✅" if result else "❌"
    print(f"{status} {name}")

# 统计菜单按钮数量
import re
menu_buttons = re.findall(r'setActiveTab\([\'"]([\w-]+)[\'"]\)', content)
unique_buttons = set(menu_buttons)

print(f"\n菜单功能点: {len(unique_buttons)} 个")
print(f"功能列表: {', '.join(sorted(unique_buttons))}")

# 检查是否有旧的平铺菜单
old_menu_pattern = r'<button\s+onClick=\{\(\) => setActiveTab\([\'"]ppt-analysis[\'"]\)\}'
old_menu = re.search(old_menu_pattern, content)

if old_menu:
    print("\n⚠️  可能还有旧的平铺菜单代码")
else:
    print("\n✅ 没有发现旧的平铺菜单代码")
