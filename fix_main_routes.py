#!/usr/bin/env python3
"""
修复 main.py 中路由注册重复和错位的问题
"""
with open("c:/test/antinet/backend/main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 找到 PPT 路由注册的开始和结束
ppt_start = None
ppt_end = None
gtd_first_start = None
gtd_second_start = None
wrong_except_start = None

for i, line in enumerate(lines):
    if '# 注册 PPT 处理路由' in line:
        ppt_start = i
    elif ppt_start and line.strip().startswith('except Exception as e:'):
        if '无法导入 PPT 处理路由' in line:
            ppt_end = i
    elif '# 注册 GTD 任务管理路由' in line and gtd_first_start is None:
        gtd_first_start = i
    elif '# 注册 GTD 任务管理路由' in line and gtd_first_start is not None:
        gtd_second_start = i
    elif ppt_end and line.strip().startswith('except Exception as e:') and '无法导入 PPT 处理路由' in line:
        wrong_except_start = i

print("找到位置:")
print("  PPT 路由: {} - {}".format(ppt_start, ppt_end))
print("  第一个 GTD: {}".format(gtd_first_start))
print("  第二个 GTD: {}".format(gtd_second_start))
print("  错误的 except: {}".format(wrong_except_start))

# 构建新的行列表
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 跳过重复的 GTD 注册 (201-207 行)
    if gtd_second_start and i >= gtd_second_start and gtd_second_start + 7 and i < gtd_second_start + 8:
        # 跳过这整个 GTD 块
        i = gtd_second_start + 8
        continue
    
    # 跳过错误的 except 块 (209-210 行)
    if wrong_except_start and i >= wrong_except_start and wrong_except_start + 2 and i < wrong_except_start + 2:
        i = wrong_except_start + 2
        continue
    
    new_lines.append(line)
    i += 1

# 写回文件
with open("c:/test/antinet/backend/main.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("\n[OK] main.py 路由注册已修复")
print("   - 删除了重复的 GTD 路由注册")
print("   - 修复了 PPT 路由的 except 块位置")