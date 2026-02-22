"""
查找首页概览区域
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找 activeTab === 'dashboard' 的位置
for i, line in enumerate(lines):
    if "activeTab === 'dashboard'" in line:
        print(f"=== 第 {i+1} 行: {line.strip()}")
        # 显示上下文
        start = max(0, i)
        end = min(len(lines), i+30)
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end='')
        print("\n" + "="*50)
