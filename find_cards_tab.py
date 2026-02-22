"""
查找 'cards' tab 的内容
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找包含 "case 'cards':" 或 "activeTab === 'cards'" 的行
for i, line in enumerate(lines):
    if "case 'cards':" in line or "activeTab === 'cards'" in line or 'activeTab.*cards' in line:
        print(f"行 {i+1}: {line.strip()}")
        # 显示上下文
        start = max(0, i-2)
        end = min(len(lines), i+30)
        print("上下文:")
        for j in range(start, end):
            marker = ">>> " if j == i else "    "
            print(f"{marker}{j+1}: {lines[j]}", end='')
        print("\n" + "="*50 + "\n")
