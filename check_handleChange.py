"""
检查handleChange函数
"""
file_path = r'C:\test\antinet\src\components\CreateCardModal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找handleChange函数
for i, line in enumerate(lines):
    if 'const handleChange' in line:
        print(f"行 {i+1}: {line.strip()}")
        # 显示函数内容
        start = i
        end = min(len(lines), i + 30)
        brace_count = 0
        for j in range(start, end):
            print(f"  {j+1}: {lines[j]}", end='')
            brace_count += lines[j].count('{') - lines[j].count('}')
            if j > start and brace_count <= 0:
                break
        print("\n" + "="*50 + "\n")
        break
