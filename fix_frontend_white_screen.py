#!/usr/bin/env python3
"""
前端白屏问题修复脚本
自动诊断并修复常见的前端白屏问题
"""

import os
import subprocess
import sys
from pathlib import Path

# 颜色输出
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"

def print_success(msg):
    print(f"{GREEN}[OK]{RESET} {msg}")

def print_error(msg):
    print(f"{RED}[FAIL]{RESET} {msg}")

def print_warning(msg):
    print(f"{YELLOW}[WARN]{RESET} {msg}")

def print_info(msg):
    print(f"{CYAN}[INFO]{RESET} {msg}")

def print_header(msg):
    print(f"\n{'='*70}")
    print(f"{msg}")
    print('='*70)

# 修复 1: 检查并修复 AuthContext 导入
def fix_auth_context_import():
    print_header("检查 AuthContext 导入")

    app_tsx = Path("C:/test/antinet/src/App.tsx")

    with open(app_tsx, 'r', encoding='utf-8') as f:
        content = f.read()

    if "import { AuthContext } from '@/contexts/authContext';" in content:
        # 检查文件扩展名
        import_line = "import { AuthContext } from '@/contexts/authContext';"
        auth_context_file = Path("C:/test/antinet/src/contexts/authContext.ts")

        if auth_context_file.exists():
            print_success("AuthContext 文件存在 (authContext.ts)")
            print_info("无需修复导入")
        else:
            print_error("AuthContext 文件不存在")
            return False
    else:
        print_warning("AuthContext 导入行未找到")

    return True

# 修复 2: 检查关键文件
def check_critical_files():
    print_header("检查关键文件")

    critical_files = {
        "index.html": "C:/test/antinet/index.html",
        "main.tsx": "C:/test/antinet/src/main.tsx",
        "App.tsx": "C:/test/antinet/src/App.tsx",
        "Home.tsx": "C:/test/antinet/src/pages/Home.tsx",
        "authContext.ts": "C:/test/antinet/src/contexts/authContext.ts",
        "useTheme.ts": "C:/test/antinet/src/hooks/useTheme.ts",
        "index.css": "C:/test/antinet/src/index.css",
    }

    all_exist = True
    for name, path in critical_files.items():
        if os.path.exists(path):
            print_success(f"{name} 存在")
        else:
            print_error(f"{name} 缺失: {path}")
            all_exist = False

    return all_exist

# 修复 3: 检查端口占用
def check_port_occupation():
    print_header("检查端口占用")

    try:
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True
        )

        port_3000_in_use = False
        for line in result.stdout.split('\n'):
            if ':3000' in line and 'LISTENING' in line:
                print_warning(f"端口 3000 已被占用: {line.strip()}")
                port_3000_in_use = True
                break

        if not port_3000_in_use:
            print_success("端口 3000 未被占用")
            return True
        else:
            print_warning("建议关闭占用端口 3000 的进程")
            print_info("运行: netstat -ano | findstr :3000")
            print_info("然后: taskkill /PID <PID> /F")
            return False

    except Exception as e:
        print_error(f"检查端口失败: {e}")
        return False

# 修复 4: 检查依赖安装
def check_dependencies():
    print_header("检查依赖安装")

    node_modules = Path("C:/test/antinet/node_modules")

    if node_modules.exists():
        print_success("node_modules 目录存在")

        # 检查关键依赖
        key_deps = [
            "react",
            "react-dom",
            "react-router-dom",
            "framer-motion",
            "recharts",
            "lucide-react",
            "sonner"
        ]

        missing = []
        for dep in key_deps:
            dep_path = node_modules / dep
            if dep_path.exists():
                print_success(f"{dep} 已安装")
            else:
                print_error(f"{dep} 未安装")
                missing.append(dep)

        if missing:
            print_warning("部分依赖缺失，建议运行: pnpm install")
            return False
        else:
            return True
    else:
        print_error("node_modules 目录不存在")
        print_info("请运行: pnpm install")
        return False

# 修复 5: 清理缓存
def clear_cache():
    print_header("清理缓存")

    cache_dirs = [
        "C:/test/antinet/node_modules/.vite",
        "C:/test/antinet/dist",
    ]

    cleared = 0
    for cache_dir in cache_dirs:
        if os.path.exists(cache_dir):
            try:
                import shutil
                shutil.rmtree(cache_dir)
                print_success(f"已删除: {cache_dir}")
                cleared += 1
            except Exception as e:
                print_error(f"删除失败 {cache_dir}: {e}")

    if cleared == 0:
        print_info("无需清理的缓存")
    else:
        print_success(f"已清理 {cleared} 个缓存目录")

# 修复 6: 启动前端
def start_frontend():
    print_header("启动前端服务")

    print_info("启动前端服务器...")
    print_info("请在新终端窗口中运行: cd C:/test/antinet && pnpm dev")
    print_info("或者使用提供的批处理脚本: start_frontend.bat")

# 修复 7: 创建启动脚本
def create_startup_script():
    print_header("创建启动脚本")

    script_content = """@echo off
echo ====================================
echo 启动 Antinet 前端服务
echo ====================================
echo.

cd /d C:\\test\\antinet

echo [1/4] 检查依赖...
if not exist "node_modules" (
    echo [ERROR] node_modules 不存在，请先运行: pnpm install
    pause
    exit /b 1
)

echo [OK] 依赖检查完成
echo.

echo [2/4] 清理 Vite 缓存...
if exist "node_modules\\.vite" (
    rmdir /s /q "node_modules\\.vite"
)
echo [OK] 缓存清理完成
echo.

echo [3/4] 检查端口占用...
netstat -ano | findstr :3000
if %ERRORLEVEL% equ 0 (
    echo [WARN] 端口 3000 已被占用
    echo 请先关闭占用端口的进程
    pause
    exit /b 1
)
echo [OK] 端口检查完成
echo.

echo [4/4] 启动开发服务器...
echo.
echo ====================================
echo 前端服务即将启动...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务
echo ====================================
echo.

pnpm dev

pause
"""

    script_path = Path("C:/test/antinet/start_frontend.bat")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)

    print_success(f"启动脚本已创建: {script_path}")

# 主函数
def main():
    print(f"\n{CYAN}{'='*70}{RESET}")
    print(f"{CYAN}Antinet 前端白屏问题修复工具{RESET}")
    print(f"{CYAN}{'='*70}{RESET}")

    # 运行诊断和修复
    fix_auth_context_import()
    files_ok = check_critical_files()
    deps_ok = check_dependencies()
    port_ok = check_port_occupation()

    if not files_ok or not deps_ok:
        print_error("发现严重问题，请先修复上述错误")
        print_header("修复建议")
        if not files_ok:
            print_info("1. 检查缺失的文件")
        if not deps_ok:
            print_info("2. 运行: pnpm install")
        return

    # 清理缓存
    clear_cache()

    # 创建启动脚本
    create_startup_script()

    # 启动建议
    start_frontend()

    print_header("诊断总结")
    print_success("诊断完成！")
    print_info("请按以下步骤操作:")
    print("  1. 打开浏览器访问: http://localhost:3000")
    print("  2. 如果页面白屏，按 F12 打开开发者工具")
    print("  3. 查看 Console 标签页的错误信息")
    print("  4. 查看 Network 标签页的失败请求")
    print("  5. 查看浏览器控制台的完整错误日志")
    print("\n如果问题依旧，请提供:")
    print("  - 浏览器控制台的完整错误信息")
    print("  - Network 标签页失败的请求列表")
    print("  - 浏览器类型和版本")

if __name__ == "__main__":
    main()
