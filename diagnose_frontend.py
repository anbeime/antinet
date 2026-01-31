#!/usr/bin/env python3
"""
前端白屏问题诊断脚本
检查前端常见问题并提供修复建议
"""

import os
import sys
import subprocess
import json
from pathlib import Path

# 颜色输出
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def print_success(msg):
    print(f"{GREEN}[OK]{RESET} {msg}")

def print_error(msg):
    print(f"{RED}[FAIL]{RESET} {msg}")

def print_warning(msg):
    print(f"{YELLOW}[WARN]{RESET} {msg}")

def print_header(msg):
    print(f"\n{'='*60}")
    print(f"{msg}")
    print('='*60)

def check_file_exists(filepath):
    """检查文件是否存在"""
    if os.path.exists(filepath):
        print_success(f"文件存在: {filepath}")
        return True
    else:
        print_error(f"文件缺失: {filepath}")
        return False

def check_imports_in_file(filepath):
    """检查文件中的导入"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # 检查是否有 @/ 开头的导入
        imports = []
        for line in content.split('\n'):
            if 'import' in line and '@/' in line:
                imports.append(line.strip())

        return imports
    except Exception as e:
        print_error(f"读取文件失败: {e}")
        return []

def verify_path_import(imports):
    """验证路径别名导入"""
    print_header("检查路径别名导入")

    project_root = Path("C:/test/antinet")

    for imp in imports:
        # 提取导入路径
        if '@/' in imp:
            import_path = imp.split('@/')[1].split("'")[0].split('"')[0]
            full_path = project_root / import_path

            if full_path.exists():
                print_success(f"导入路径有效: {imp}")
            else:
                print_error(f"导入路径无效: {imp}")
                print(f"  期望路径: {full_path}")

def check_dependencies():
    """检查依赖包"""
    print_header("检查依赖包")

    package_json = Path("C:/test/antinet/package.json")
    with open(package_json, 'r', encoding='utf-8') as f:
        data = json.load(f)

    dependencies = {**data.get('dependencies', {}), **data.get('devDependencies', {})}

    # 关键依赖检查
    key_deps = [
        'react', 'react-dom', 'react-router-dom',
        'framer-motion', 'recharts', 'lucide-react', 'sonner',
        'vite', 'typescript', 'tailwindcss'
    ]

    for dep in key_deps:
        if dep in dependencies:
            print_success(f"{dep}: {dependencies[dep]}")
        else:
            print_error(f"缺少依赖: {dep}")

def check_vite_config():
    """检查 Vite 配置"""
    print_header("检查 Vite 配置")

    vite_config = Path("C:/test/antinet/vite.config.ts")
    if check_file_exists(vite_config):
        with open(vite_config, 'r', encoding='utf-8') as f:
            content = f.read()

        if '@vitejs/plugin-react' in content:
            print_success("React 插件已配置")
        else:
            print_error("React 插件未配置")

        if 'tsconfigPaths' in content:
            print_success("路径别名插件已配置")
        else:
            print_error("路径别名插件未配置")

def check_tsconfig():
    """检查 TypeScript 配置"""
    print_header("检查 TypeScript 配置")

    tsconfig = Path("C:/test/antinet/tsconfig.json")
    if check_file_exists(tsconfig):
        with open(tsconfig, 'r', encoding='utf-8') as f:
            content = f.read()

        if '"baseUrl": "./"' in content:
            print_success("baseUrl 已配置")
        else:
            print_error("baseUrl 未配置")

        if '"@/*": ["./src/*"]' in content:
            print_success("路径别名 @/* 已配置")
        else:
            print_error("路径别名 @/* 未配置")

def check_index_html():
    """检查 index.html"""
    print_header("检查 index.html")

    index_html = Path("C:/test/antinet/index.html")
    if check_file_exists(index_html):
        with open(index_html, 'r', encoding='utf-8') as f:
            content = f.read()

        if '<div id="root">' in content:
            print_success("root 元素存在")
        else:
            print_error("root 元素缺失")

        if '<script type="module" src="/src/main.tsx">' in content:
            print_success("main.tsx 入口已配置")
        else:
            print_error("main.tsx 入口未配置")

def check_main_tsx():
    """检查 main.tsx"""
    print_header("检查 main.tsx")

    main_tsx = Path("C:/test/antinet/src/main.tsx")
    if check_file_exists(main_tsx):
        with open(main_tsx, 'r', encoding='utf-8') as f:
            content = f.read()

        if "createRoot" in content:
            print_success("createRoot 存在")
        else:
            print_error("createRoot 缺失")

        if "BrowserRouter" in content:
            print_success("BrowserRouter 存在")
        else:
            print_error("BrowserRouter 缺失")

        if "<App />" in content:
            print_success("App 组件已渲染")
        else:
            print_error("App 组件未渲染")

def check_app_tsx():
    """检查 App.tsx"""
    print_header("检查 App.tsx")

    app_tsx = Path("C:/test/antinet/src/App.tsx")
    if check_file_exists(app_tsx):
        with open(app_tsx, 'r', encoding='utf-8') as f:
            content = f.read()

        imports = check_imports_in_file(app_tsx)
        if imports:
            verify_path_import(imports)

        if "AuthContext" in content:
            print_success("AuthContext 已导入")

        if "<Routes>" in content:
            print_success("Routes 组件存在")
        else:
            print_error("Routes 组件缺失")

def check_critical_files():
    """检查关键文件"""
    print_header("检查关键文件")

    critical_files = [
        "C:/test/antinet/index.html",
        "C:/test/antinet/src/main.tsx",
        "C:/test/antinet/src/App.tsx",
        "C:/test/antinet/src/pages/Home.tsx",
        "C:/test/antinet/src/contexts/authContext.ts",
        "C:/test/antinet/src/hooks/useTheme.ts",
        "C:/test/antinet/src/index.css",
        "C:/test/antinet/tailwind.config.js",
        "C:/test/antinet/vite.config.ts",
        "C:/test/antinet/tsconfig.json",
        "C:/test/antinet/package.json",
    ]

    all_exist = True
    for filepath in critical_files:
        if not check_file_exists(filepath):
            all_exist = False

    return all_exist

def check_server_status():
    """检查服务器状态"""
    print_header("检查服务器状态")

    try:
        import urllib.request
        urllib.request.urlopen("http://localhost:3000", timeout=2)
        print_success("前端服务器运行正常 (http://localhost:3000)")
    except Exception as e:
        print_warning("前端服务器未运行或无法访问")
        print(f"  错误: {e}")

def main():
    print(f"\n{YELLOW}Antinet 前端白屏问题诊断{RESET}")
    print(f"{'='*60}")

    # 检查关键文件
    critical_files_ok = check_critical_files()

    # 检查依赖
    check_dependencies()

    # 检查配置文件
    check_vite_config()
    check_tsconfig()

    # 检查入口文件
    check_index_html()
    check_main_tsx()

    # 检查 App.tsx
    check_app_tsx()

    # 检查服务器状态
    check_server_status()

    print_header("诊断总结")

    if critical_files_ok:
        print_success("所有关键文件存在")
    else:
        print_error("部分关键文件缺失，请检查上述错误")

    print("\n建议:")
    print("1. 打开浏览器访问 http://localhost:3000")
    print("2. 按 F12 打开开发者工具")
    print("3. 查看 Console 标签页的错误信息")
    print("4. 查看 Network 标签页是否有失败的请求")
    print("5. 如果页面空白，检查 DOM 中是否有内容")

if __name__ == "__main__":
    main()
