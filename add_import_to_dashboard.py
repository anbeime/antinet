"""
在首页概览添加导入知识记录按钮
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找要替换的目标
old_code = '''<h2 className="text-xl font-bold mb-4">知识概览</h2>'''

new_code = '''<div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">知识概览</h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload size={18} />
                    <span>导入知识记录</span>
                  </motion.button>
                </div>'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ 已在首页概览添加'导入知识记录'按钮")
else:
    print("❌ 未找到目标代码")
    # 检查是否存在
    if '知识概览' in content:
        print("'知识概览' 存在于文件中")
