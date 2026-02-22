"""
查找并修复textarea的onChange
"""
file_path = r'C:\test\antinet\src\components\CreateCardModal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找包含 content 的 textarea
for i, line in enumerate(lines):
    if 'textarea' in line.lower() and 'content' in line.lower():
        print(f"行 {i+1}: {line.strip()}")
        # 显示上下文
        start = max(0, i-3)
        end = min(len(lines), i+10)
        for j in range(start, end):
            print(f"  {j+1}: {lines[j]}", end='')
        print("\n" + "="*50 + "\n")

# 查找所有 onChange
print("=== 所有 onChange ===")
for i, line in enumerate(lines):
    if 'onChange' in line and 'content' in line:
        print(f"行 {i+1}: {line.strip()}")
