"""
检查ImportModal的渲染问题
"""
file_path = r'C:\test\antinet\src\components\ImportModal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 检查是否有条件渲染问题
if 'isOpen' in content:
    print("✅ 有isOpen属性")
else:
    print("❌ 缺少isOpen属性")

# 检查是否有return null
if 'return null' in content or 'return null;' in content:
    print("✅ 有return null处理")
else:
    print("⚠️  可能没有return null处理")

# 检查useEffect
if 'useEffect' in content:
    print("✅ 有useEffect")
else:
    print("⚠️  没有useEffect")

# 查找渲染部分
import re
# 查找 return 语句
returns = re.findall(r'return\s*\((.*?)\);', content, re.DOTALL)
print(f"\n找到 {len(returns)} 个return语句")

# 检查是否有错误边界
if 'try' in content and 'catch' in content:
    print("✅ 有try-catch")
else:
    print("⚠️  没有try-catch")

# 检查是否有未定义的变量
undefined_patterns = ['cardTypeMap\[', 'onImport\(']
for pattern in undefined_patterns:
    if pattern in content:
        print(f"✅ 使用了 {pattern}")
