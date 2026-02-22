"""
查找textarea
"""
file_path = r'C:\test\antinet\src\components\CreateCardModal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找textarea
for i, line in enumerate(lines):
    if '<textarea' in line.lower():
        print(f"行 {i+1}: {line.strip()}")
        # 显示上下文
        start = max(0, i-2)
        end = min(len(lines), i+15)
        for j in range(start, end):
            print(f"  {j+1}: {lines[j]}", end='')
        print("\n" + "="*50 + "\n")
