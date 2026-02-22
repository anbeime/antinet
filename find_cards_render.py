"""
查找知识卡片页面的渲染
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找 "cards" 在 return 语句中的位置
in_return = False
return_start = 0
brace_count = 0

for i, line in enumerate(lines):
    # 查找 return 语句
    if 'return (' in line or 'return(' in line:
        in_return = True
        return_start = i
        brace_count = 1
        continue
    
    if in_return:
        # 计算大括号
        brace_count += line.count('(') - line.count(')')
        brace_count += line.count('{') - line.count('}')
        
        # 检查是否包含 cards 相关内容
        if "'cards'" in line or '"cards"' in line or 'activeTab.*cards' in line:
            print(f"行 {i+1}: {line.strip()}")
            # 显示上下文
            start = max(0, i-5)
            end = min(len(lines), i+20)
            for j in range(start, end):
                print(f"  {j+1}: {lines[j]}", end='')
            print("\n" + "="*50 + "\n")
        
        # 如果 brace_count 为 0，说明 return 结束
        if brace_count <= 0:
            in_return = False
