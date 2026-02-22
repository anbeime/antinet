#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
聊天机器人修复脚本
自动配置后端路由
"""

import os
import sys
from pathlib import Path

def add_route_to_main_py():
    """在 main.py 中添加聊天路由"""
    main_py_path = Path("backend/main.py")
    
    if not main_py_path.exists():
        print(f"❌ 找不到 {main_py_path}")
        return False
    
    content = main_py_path.read_text(encoding='utf-8')
    
    # 检查是否已经添加
    if "chat_routes_simple" in content:
        print("✅ 路由已存在，无需修改")
        return True
    
    # 查找添加路由的位置（在 app 创建之后）
    # 查找 "app = FastAPI" 或类似代码
    
    # 方案1: 在文件末尾添加
    new_code = '''

# ============ 聊天机器人路由 ============
try:
    from routes.chat_routes_simple import router as simple_chat_router
    app.include_router(simple_chat_router)
    print("[INIT] 聊天机器人路由已注册: /api/chat/simple")
except Exception as e:
    print(f"[WARN] 聊天机器人路由注册失败: {e}")
# =========================================
'''
    
    # 添加到文件末尾
    content = content.rstrip() + new_code + "\n"
    
    # 备份原文件
    backup_path = Path("backend/main.py.backup")
    backup_path.write_text(main_py_path.read_text(encoding='utf-8'), encoding='utf-8')
    print(f"✅ 已备份原文件到 {backup_path}")
    
    # 写入新内容
    main_py_path.write_text(content, encoding='utf-8')
    print(f"✅ 已更新 {main_py_path}")
    
    return True


def check_backend_structure():
    """检查后端结构"""
    print("\n📁 检查后端结构...")
    
    required_files = [
        "backend/main.py",
        "backend/routes/chat_routes_simple.py"
    ]
    
    all_exist = True
    for file in required_files:
        path = Path(file)
        if path.exists():
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} (缺失)")
            all_exist = False
    
    return all_exist


def print_usage():
    """打印使用说明"""
    print("""
============================================
  聊天机器人修复完成！
============================================

使用步骤：

1. 启动后端服务
   cd backend
   python main.py

2. 启动前端服务
   npm run dev

3. 访问测试页面
   http://localhost:5173/working-chat-test

4. 测试功能
   - 文本输入
   - 图片上传
   - 查看后端连接状态

============================================
""")


def main():
    """主函数"""
    print("=" * 60)
    print("  聊天机器人修复工具")
    print("=" * 60)
    
    # 检查后端结构
    if not check_backend_structure():
        print("\n❌ 后端文件不完整，请确保文件存在")
        return
    
    # 添加路由
    print("\n🔧 配置后端路由...")
    if add_route_to_main_py():
        print("\n✅ 路由配置完成")
    else:
        print("\n❌ 路由配置失败")
        return
    
    # 打印使用说明
    print_usage()


if __name__ == "__main__":
    main()
