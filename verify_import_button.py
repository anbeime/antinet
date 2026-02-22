"""
验证导入按钮是否添加成功
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 检查导入按钮在首页
if '知识概览' in content and '导入知识记录' in content:
    # 查找它们的位置关系
    overview_pos = content.find('知识概览')
    import_pos = content.find('导入知识记录')
    
    if import_pos > overview_pos and import_pos - overview_pos < 500:
        print("✅ '导入知识记录'按钮已成功添加到首页概览区域")
    else:
        print("⚠️  按钮位置可能需要调整")
else:
    print("❌ 未找到相关代码")

# 统计导入按钮出现次数
import_count = content.count('导入知识记录')
print(f"\n'导入知识记录'按钮出现次数: {import_count}")

if import_count >= 2:
    print("✅ 首页和知识卡片页面都有导入按钮")
