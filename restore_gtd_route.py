import re

file_path = r"c:\\test\\antinet\\backend\\main.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# 查找 PPT 路由注册成功日志行索引
insert_index = None
for i, line in enumerate(lines):
    if 'logger.info("✓ PPT 处理路由已注册")' in line:
        insert_index = i
        break

if insert_index is None:
    print("未找到 PPT 路由注册日志行，无法插入 GTD 路由")
    exit(1)

# 向下找连续的空行直到遇到 "# 初始化 8-Agent 系统"
while insert_index < len(lines) - 1:
    insert_index += 1
    # 如果遇到非空行且不是注释行，则停止
    if lines[insert_index].strip() != "" and not lines[insert_index].strip().startswith("# 初始化"):
        # 回退一步，因为我们要插在空行区域末尾
        insert_index -= 1
        break
    # 如果找到了 "# 初始化 8-Agent 系统"，就插在这之前
    if lines[insert_index].strip().startswith("# 初始化 8-Agent 系统"):
        break

# 要插入的 GTD 路由注册代码
gtd_block = [
    "\n",
    "# 注册 GTD 任务管理路由\n",
    "try:\n",
    "    from routes.gtd_routes import router as gtd_router\n",
    "    app.include_router(gtd_router)  # GTD 任务管理路由\n",
    "    logger.info(\"✓ GTD 任务管理路由已注册\")\n",
    "except Exception as e:\n",
    "    logger.warning(f\"无法导入 GTD 任务管理路由: {e}\")\n",
    "\n"
]

# 插入
for blk in reversed(gtd_block):
    lines.insert(insert_index + 1, blk)

# 写回文件
with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("SUCCESS: GTD 路由注册代码已恢复到 main.py")