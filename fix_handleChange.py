"""
查找并修改handleChange函数
"""
file_path = r'C:\test\antinet\src\components\CreateCardModal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找 handleChange 函数
import re

# 查找 handleChange 定义
pattern = r'(const handleChange = \(e: React\.ChangeEvent<HTMLInputElement \| HTMLTextAreaElement>\) => \{[^}]+\})'

match = re.search(pattern, content)
if match:
    print("找到 handleChange:")
    print(match.group(0))
else:
    print("未找到 handleChange，尝试查找简化版本")
    # 查找简化的 handleChange
    pattern2 = r'const handleChange = \(e:[^)]+\) => \{[^}]+setFormData[^}]+\}'
    match2 = re.search(pattern2, content, re.DOTALL)
    if match2:
        print("找到简化版 handleChange:")
        print(match2.group(0)[:200])
