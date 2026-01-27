"""
测试技能系统
"""
import sys
sys.path.insert(0, 'C:/test/antinet/backend')

from services.skill_system import get_skill_registry

# 获取技能注册表
registry = get_skill_registry()

# 列出所有技能
skills = registry.list_skills()

print(f"=" * 60)
print(f"Antinet 技能系统测试")
print(f"=" * 60)
print(f"\n总计技能数量: {len(skills)}\n")

# 按类别分组
categories = {}
for skill in skills:
    category = skill['category']
    if category not in categories:
        categories[category] = []
    categories[category].append(skill)

# 打印每个类别的技能
for i, (category, category_skills) in enumerate(categories.items(), 1):
    print(f"\n{i}. {category} ({len(category_skills)} 个技能)")
    print("-" * 60)
    for j, skill in enumerate(category_skills, 1):
        print(f"   {j}. {skill['name']}")
        print(f"      描述: {skill['description']}")
        print(f"      Agent: {skill['agent_name']}")
        status = "Enabled" if skill['enabled'] else "Disabled"
        print(f"      Status: {status}")
        print(f"      使用次数: {skill['usage_count']}")
        print()

print(f"=" * 60)
print(f"测试完成！")
print(f"=" * 60)
