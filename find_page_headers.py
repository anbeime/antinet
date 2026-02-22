"""
查找其他页面的标题样式
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找所有页面标题（h1或h2）
import re

# 查找 h1 标题
h1_pattern = r'<h1[^>]*className="([^"]*)"[^>]*>([^<]*)</h1>'
h1_matches = re.findall(h1_pattern, content)

print("=== h1 标题 ===")
for class_name, text in h1_matches:
    print(f"文本: {text}")
    print(f"样式: {class_name}")
    print()

# 查找 h2 标题
h2_pattern = r'<h2[^>]*className="([^"]*)"[^>]*>([^<]*)</h2>'
h2_matches = re.findall(h2_pattern, content)

print("=== h2 标题 ===")
for class_name, text in h2_matches:
    print(f"文本: {text}")
    print(f"样式: {class_name}")
    print()
