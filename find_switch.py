"""
查找switch语句或条件渲染
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找 switch 或 {activeTab ===
for i, line in enumerate(lines):
    if 'switch' in line.lower() or 'activeTab ===' in line:
        print(f"行 {i+1}: {line.strip()}")
        # 显示上下文
        start = max(0, i-2)
        end = min(len(lines), i+10)
        for j in range(start, end):
            marker = ">>> " if j == i else "    "
            print(f"{marker}{j+1}: {lines[j]}", end='')
        print("\n" + "="*50 + "\n")
