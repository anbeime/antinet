"""
修复文件编码问题
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 检查是否有乱码
if '姒傝' in content:
    print("发现乱码，正在修复...")
    content = content.replace('姒傝', '概览')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ 编码修复完成")
else:
    print("✅ 没有乱码")

# 检查其他可能的乱码
import re
# 查找中文字符
chinese_chars = re.findall(r'[\u4e00-\u9fff]+', content)
print(f"\n文件中的中文字符: {len(chinese_chars)} 处")
