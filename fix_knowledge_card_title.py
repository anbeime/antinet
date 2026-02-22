"""
修复"知识卡片库"标题样式，使其与"卡片管理"一致
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 旧的标题代码
old_title = '''<div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">知识卡片库</h2>'''

# 新的标题代码（与卡片管理页面一致）
new_title = '''<div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      知识卡片库
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      管理和浏览所有知识卡片
                    </p>
                  </div>
                </div>'''

if old_title in content:
    content = content.replace(old_title, new_title)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ '知识卡片库'标题样式已修复")
else:
    print("❌ 未找到旧标题代码")
    # 尝试查找部分匹配
    if '知识卡片库' in content:
        print("找到'知识卡片库'文本，但格式不匹配")
