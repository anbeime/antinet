"""
查找首页内容区域
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找 {activeTab === 'dashboard' && 的位置
for i, line in enumerate(lines):
    if "{activeTab === 'dashboard' &&" in line:
        print(f"=== 第 {i+1} 行 ===")
        # 显示上下文
        start = i
        end = min(len(lines), i+50)
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end='')
        print("\n" + "="*50)
        break
