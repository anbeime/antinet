#!/usr/bin/env python3
"""
知易AI知识管理系统 - ARM64 安装包构建脚本 v3 (完整版)
======================================================
在 ARM 设备(骁龙X Elite)上运行此脚本，一键生成 .exe 安装程序

功能：
1. PyInstaller 打包后端为独立 exe（隐藏源码）
2. Vite 构建前端静态文件
3. NSIS 生成 Windows 安装程序 .exe
4. 同时生成 ZIP 便携版

使用方法（在ARM设备上）:
    cd /path/to/xiaolong
    pip install pyinstaller nsis
    npm install          # 前端依赖
    python scripts/build_arm_installer.py

输出：
    output/知易AI知识管理系统_Setup_ARM64.exe   ← NSIS安装程序
    output/知易AI知识管理系统_ARM64_Portable.zip ← ZIP便携版
"""

import os
import sys
import shutil
import zipfile
import subprocess
import time
from pathlib import Path
from datetime import datetime

# ============================================================
# 配置
# ============================================================
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
BUILD_DIR = PROJECT_ROOT / "build_installer"
OUTPUT_DIR = PROJECT_ROOT / "output"
DIST_DIR = BUILD_DIR / "dist"           # PyInstaller 输出
FRONTEND_DIST = BUILD_DIR / "frontend_dist"  # Vite 构建输出

APP_NAME = "知易AI知识管理系统"
APP_VERSION = "1.0"
INSTALLER_NAME = f"{APP_NAME}_Setup_ARM64"

# PyInstaller 配置
PYI_ENTRY = "backend/main.py"
PYI_NAME = "zhiyi_backend"
PYI_WORKPATH = "backend"              # 工作路径（相对于项目根目录）
PYI_DATADIR = "."                     # 数据目录前缀

# 需要包含的核心目录（除了后端，后端由PyInstaller打包）
CORE_DIRS = [
    ("src", True),                    # (目录名, 是否必需)
    ("frontend", True),
    ("tools", True),
]

# skills 子集
SKILLS_INCLUDE = ["xlsx", "pptx"]

# 核心单文件
CORE_FILES = [
    "index.html",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
]

# 排除模式
EXCLUDE_PATTERNS = [
    "__pycache__", "*.pyc", "*.pyo",
    "node_modules", ".git", ".env",
    "*.log", "*.tmp", "*.bak", ".cache",
    "venv*", ".venv",
    ".DS_Store", "Thumbs.db",
    "资料参考", "测试文档",
    "antinet-promo-video", "remotion-output", "remotion-project",
    "zhiyi_new", "ppt/",
    "*.bin", "*.onnx", "*.pt", "*.pth", "*.safetensors",
    "QAIRT", "QAIRT_Runtime",
    "ai-engine-direct-helper-main",
    "poppler-*", "minimax-*",
]


def log(msg: str):
    """带时间戳的日志"""
    print(f"  [{datetime.now().strftime('%H:%M:%S')}] {msg}")


def run_cmd(cmd: list, cwd=None, check=True) -> subprocess.CompletedProcess:
    """运行命令并实时输出"""
    log(f"运行: {' '.join(cmd)}")
    result = subprocess.run(
        cmd, cwd=cwd or str(PROJECT_ROOT),
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    if check and result.returncode != 0:
        log(f"命令失败(退出码 {result.returncode})")
        if result.stderr:
            log(f"错误: {result.stderr[-500:]}")
    return result


def step_1_pyinstaller():
    """Step 1: 用 PyInstaller 打包后端 exe"""
    print("\n" + "=" * 60)
    print("[Step 1/5] PyInstaller 打包后端...")
    print("=" * 60)

    # 检查 PyInstaller
    try:
        import PyInstaller
        log(f"PyInstaller 版本: {PyInstaller.__version__}")
    except ImportError:
        print("  [ERROR] 未安装 PyInstaller！")
        print("         请运行: pip install pyinstaller")
        sys.exit(1)

    # 清理旧的构建
    for d in [DIST_DIR, BUILD_DIR / "build", BUILD_DIR / f"{PYI_NAME}.spec"]:
        if d.exists():
            shutil.rmtree(d)
            log(f"清理旧文件: {d.name}")

    # 构建 PyInstaller 命令
    # 关键参数说明：
    # --onefile       : 打包成单个exe
    # --noconsole     : 不显示控制台窗口（后台运行）
    # --name          : 输出文件名
    # --paths         : 添加搜索路径
    # --hidden-import : 显式声明动态导入的模块
    # --collect-all   : 收集整个包（解决一些隐式依赖）
    # --add-data      : 添加非Python数据文件
    
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--noconsole",
        f"--name={PYI_NAME}",
        f"--workpath={BUILD_DIR / 'build'}",
        f"--distpath={DIST_DIR}",
        f"--specpath={BUILD_DIR}",
        # 路径设置
        f"--paths={PROJECT_ROOT / 'backend'}",
        f"--paths={PROJECT_ROOT}",
        # 动态导入的路由模块 - 必须显式声明！
        "--hidden-import=routes.knowledge_routes",
        "--hidden-import=routes.chat_routes",
        "--hidden-import=routes.data_routes",
        "--hidden-import=routes.agent_routes",
        "--hidden-import=routes.skill_routes",
        "--hidden-import=routes.npu_routes",
        "--hidden-import=routes.pdf_routes",
        "--hidden-import=routes.pdf_opendataloader_routes",
        "--hidden-import=routes.ocr_routes",
        "--hidden-import=routes.excel_routes",
        "--hidden-import=routes.ppt_routes",
        "--hidden-import=routes.multi_model_routes",
        "--hidden-import=routes.genie_playground_routes",
        "--hidden-import=routes.gtd_routes",
        "--hidden-import=routes.backlink_routes",
        "--hidden-import=routes.integration_routes",
        "--hidden-import=routes.moc_routes",
        "--hidden-import=routes.vision_routes",
        "--hidden-import=routes.enhanced_chat_routes",
        "--hidden-import=routes.evolving_chat_routes",
        "--hidden-import=routes.hermes_chat_routes",
        "--hidden-import=routes.chat_context_routes",
        "--hidden-import=routes.md2pdf_routes",
        "--hidden-import=routes.card_pdf_routes",
        "--hidden-import=routes.libreoffice_routes",
        "--hidden-import=routes.wiki",
        "--hidden-import=routes.wiki_routes",
        "--hidden-import=routes.markdown_converter_routes",
        "--hidden-import=routes.meeting_routes",
        "--hidden-import=routes.speech_routes",
        "--hidden-import=routes.research_routes",
        "--hidden-import=routes.ppt_structure_routes",
        "--hidden-import=routes.analysis_routes",
        "--hidden-import=routes.analysis_advanced_routes",
        "--hidden-import=routes.mindmap_routes",
        "--hidden-import=routes.remotion_routes",
        "--hidden-import=routes.report_routes",
        "--hidden-import=routes.ppt_preview_routes",
        "--hidden-import=routes.pandoc_routes",
        "--hidden-import=routes.image_routes",
        "--hidden-import=routes.model_routes",
        "--hidden-import=routes.model_router",
        "--hidden-import=routes.mock_routes",
        "--hidden-import=routes.conversation_context",
        "--hidden-import=routes.eight_agent_engine",
        "--hidden-import=routes.auto_card",
        "--hidden-import=routes.chat_vector_patch",
        "--hidden-import=routes.knowledge_graph",
        "--hidden-import=routes.knowledge_center_routes",
        "--hidden-import=routes.collaboration_routes",
        # 服务层
        "--hidden-import=services.ai",
        "--hidden-import=services.reminder_service",
        "--hidden-import=AIServiceFactory",
        # 配置层
        "--hidden-import=conf.app",
        "--hidden-import=conf.database",
        "--hidden-import=conf.npu",
        "--hidden-import=conf.base",
        # 中间件
        "--hidden-import=middleware",
        # 数据库
        "--hidden-import=database",
        # 工具
        "--hidden-import=tools.import_knowledge_batch",
        # 收集完整包（重要！解决隐式依赖）
        "--collect-all=fastapi",
        "--collect-all=uvicorn",
        "--collect-all=pydantic",
        "--collect-all=pandas",
        "--collect-all=numpy",
        "--collect-all=openpyxl",
        "--collect-all=reportlab",
        "--collect-all=PIL",
        "--collect-all=sqlalchemy",
        "--collect-all=loguru",
        "--collect-all=apscheduler",
        "--collect-all=aiofiles",
        "--collect-all=python_multipart",
        "--collect-all=httpx",
        "--collect-all=duckdb",
        "--collect-all=markdown",
        # 数据文件：skills 目录
        f"--add-data={PROJECT_ROOT / 'backend' / 'skills'};backend/skills",
        # 入口
        PYI_ENTRY,
    ]

    log("开始打包（这可能需要几分钟）...")
    start = time.time()

    result = run_cmd(cmd)

    elapsed = time.time() - start
    exe_path = DIST_DIR / f"{PYI_NAME}.exe"

    if exe_path.exists():
        size_mb = exe_path.stat().st_size / 1024 / 1024
        log(f"打包成功! {exe_path.name} = {size_mb:.1f} MB ({elapsed:.0f}s)")
        return exe_path, size_mb
    else:
        log(f"打包失败！未找到输出文件。检查上方错误信息。")
        # 尝试 windowed 模式（如果 noconsole 失败）
        log("尝试 console 模式重新打包...")
        cmd2 = [c for c in cmd if c != "--noconsole"] + ["--console"]
        run_cmd(cmd2)
        
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / 1024 / 1024
            log(f"Console模式打包成功! {size_mb:.1f} MB")
            return exe_path, size_mb
        
        sys.exit(1)


def step_2_frontend():
    """Step 2: 构建前端静态文件"""
    print("\n" + "=" * 60)
    print("[Step 2/5] 构建前端...")
    print("=" * 60)

    # 检查 Node.js
    node_check = run_cmd(["node", "--version"], check=False)
    if node_check.returncode != 0:
        log("[WARN] Node.js 未安装，跳过前端构建")
        return None, 0

    log(f"Node.js: {node_check.stdout.strip()}")

    # 清理旧构建
    if FRONTEND_DIST.exists():
        shutil.rmtree(FRONTEND_DIST)

    # 安装依赖（如果需要）
    nm_dir = PROJECT_ROOT / "node_modules"
    if not nm_dir.exists():
        log("安装前端依赖...")
        run_cmd(["npm", "install", "--registry", "https://registry.npmjs.org"])
    else:
        log("node_modules 已存在")

    # Vite 构建
    log("Vite 构建中...")
    start = time.time()

    # 使用 vite build 到自定义目录
    result = run_cmd([
        "npx", "vite", "build",
        f"--outDir={FRONTEND_DIST}",
        "./index.html"
    ], check=False)

    elapsed = time.time() - start

    # 检查构建结果
    if FRONTEND_DIST.exists():
        files = list(FRONTEND_DIST.rglob('*'))
        size_mb = sum(f.stat().st_size for f in files if f.is_file()) / 1024 / 1024
        file_count = len([f for f in files if f.is_file()])
        log(f"前端构建成功! {file_count} files, {size_mb:.1f} MB ({elapsed:.0f}s)")
        return FRONTEND_DIST, size_mb
    else:
        log("[WARN] 前端构建失败，将使用源码模式")
        return None, 0


def step_3_assemble(exe_path: Path, frontend_dir, exe_size: float, frontend_size: float):
    """Step 3: 组装安装包内容"""
    print("\n" + "=" * 60)
    print("[Step 3/5] 组装安装包内容...")
    print("=" * 60)

    # 清理
    if BUILD_DIR.exists():
        # 保留 dist 和 frontend_dist
        for item in BUILD_DIR.iterdir():
            if item.name not in ('dist', 'frontend_dist') and item.is_dir():
                shutil.rmtree(item)
            elif item.is_file():
                item.unlink()
    else:
        BUILD_DIR.mkdir(parents=True, exist_ok=True)

    total_size = 0
    file_count = 0

    # 1. 复制后端 exe
    dest_exe = BUILD_DIR / exe_path.name
    shutil.copy2(exe_path, dest_exe)
    total_size += dest_exe.stat().st_size
    file_count += 1
    log(f"[OK] {dest_exe.name}  ({exe_size:.1f} MB)")

    # 2. 复制前端（构建产物或源码）
    if frontend_dir and frontend_dir.exists():
        dest_frontend = BUILD_DIR / "static"
        shutil.copytree(frontend_dir, dest_frontend)
        sz = sum(f.stat().st_size for f in dest_frontend.rglob('*') if f.is_file())
        fc = len(list(dest_frontend.rglob('*')))
        total_size += sz
        file_count += fc
        log(f"[OK] static/  ({sz/1024/1024:.1f} MB, {fc} files) [已构建]")
    else:
        # 复制前端源码
        for dir_name, required in CORE_DIRS:
            src = PROJECT_ROOT / dir_name
            if src.exists():
                dst = BUILD_DIR / dir_name
                shutil.copytree(src, dst)
                sz = sum(f.stat().st_size for f in dst.rglob('*') if f.is_file())
                fc = len(list(dst.rglob('*')))
                total_size += sz
                file_count += fc
                log(f"[OK] {dir_name}/  ({sz/1024/1024:.1f} MB, {fc} files)")

        # 单文件
        for fname in CORE_FILES:
            src = PROJECT_ROOT / fname
            if src.exists():
                dst = BUILD_DIR / fname
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                total_size += dst.stat().st_size
                file_count += 1
                log(f"[OK] {fname}")

    # 3. 复制 skills
    skills_src = PROJECT_ROOT / "skills"
    skills_dst = BUILD_DIR / "skills"
    if skills_src.exists():
        skills_dst.mkdir(parents=True, exist_ok=True)
        for sub in SKILLS_INCLUDE:
            sub_src = skills_src / sub
            if sub_src.exists():
                sub_dst = skills_dst / sub
                shutil.copytree(sub_src, sub_dst)
                sz = sum(f.stat().st_size for f in sub_dst.rglob('*') if f.is_file())
                fc = len(list(sub_dst.rglob('*')))
                total_size += sz
                file_count += fc
                log(f"[OK] skills/{sub}/  ({sz/1024/1024:.1f} MB)")

    # 4. 创建启动脚本
    create_launcher_scripts(has_frontend=bool(frontend_dir))

    # 5. 创建 README 和 LICENSE
    create_readme(has_frontend=bool(frontend_dir))
    create_license()

    log(f"\n组装完成: {total_size/1024/1024:.1f} MB, {file_count} files")
    return total_size, file_count


def create_launcher_scripts(has_frontend: bool = False):
    """创建启动脚本"""
    
    if has_frontend:
        # 有预构建前端 → 后端exe + 静态文件服务
        start_bat = r'''@echo off
chcp 65001 >nul 2>&1
title 知易AI知识管理系统 v1.0
cd /d "%~dp0"

echo.
echo   ===========================================
echo     知易AI知识管理系统 v1.0
echo     基于骁龙X Elite NPU优化
echo   ===========================================
echo.

:: 启动后端（内置静态文件服务）
echo [INFO] 启动服务...
start "" zhiyi_backend.exe

:: 等待启动
timeout /t 5 /nobreak >nul

:: 打开浏览器
start http://localhost:8000

echo.
echo   ===========================================
echo   服务已启动！
echo   访问地址: http://localhost:8000
echo   ===========================================
echo.
echo 按任意键可关闭此窗口（不影响服务运行）...
pause >nul
'''
    else:
        # 无预构建前端 → 后端exe + 开发模式前端
        start_bat = r'''@echo off
chcp 65001 >nul 2>&1
title 知易AI知识管理系统 v1.0
cd /d "%~dp0"

echo.
echo   ===========================================
echo     知易AI知识管理系统 v1.0
echo     基于骁龙X Elite NPU优化
echo   ===========================================
echo.

:: 启动后端
echo [INFO] 启动后端服务...
start "知易AI-后端" "" zhiyi_backend.exe

:: 等待后端就绪
timeout /t 6 /nobreak >nul

:: 启动前端开发服务器
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] 启动前端服务...
    start "知易AI-前端" cmd /c "call npm install --registry https://registry.npmjs.org && call npm run dev:client"
) else (
    echo [WARN] 未检测到 Node.js
)

timeout /t 8 /nobreak >nul
start http://localhost:3000

echo.
echo   ===========================================
echo   服务已启动！
echo   前端: http://localhost:3000
echo   后端: http://127.0.0.1:8000
echo   ===========================================
pause
'''

    (BUILD_DIR / "start.bat").write_text(start_bat, encoding='utf-8')

    stop_bat = r'''@echo off
echo 正在停止知易AI服务...
taskkill /f /im zhiyi_backend.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo 服务已停止。
pause
'''
    (BUILD_DIR / "stop.bat").write_text(stop_bat, encoding='utf-8')

    log("[OK] start.bat / stop.bat")


def create_readme(has_frontend: bool = False):
    """创建安装说明"""
    if has_frontend:
        readme = f"""# {APP_NAME} v{APP_VERSION}

## 快速开始

### 1. 解压/安装
将本软件解压或安装到任意目录。

### 2. 双击启动
```
双击 start.bat
```

### 3. 打开浏览器
访问 http://localhost:8000

---

## 系统要求
- **操作系统**: Windows 11 on ARM (骁龙X Elite/X Plus)
- **处理器**: ARM64 (无需额外安装 Python/Node.js!)
- **内存**: 8GB+
- **磁盘**: 200MB+

## 功能特性
- **8大智能体协同** — 锦衣卫体系全链路协作
- **四色卡片分类** — 蓝(事实)/绿(解释)/黄(风险)/红(行动)
- **文档智能分析** — PDF/DOCX/TXT 一键解析
- **向量语义搜索** — AI驱动的精准检索
- **NPU硬件加速** — 骁龙X Elite NPU推理优化

## 技术栈
| 层级 | 技术 |
|------|------|
| 后端 | Python + FastAPI + ONNX Runtime |
| 前端 | React + TypeScript + TailwindCSS |
| AI引擎 | 高通 QNN SDK (NPU加速) |

---
_{APP_NAME} | 基于骁龙X Elite NPU优化的企业级AI知识管理解决方案_
"""
    else:
        readme = f"""# {APP_NAME} v{APP_VERSION}

## 快速开始

### 1. 环境准备
确保已安装:
- **Python 3.10+** — https://www.python.org/downloads/
- **Node.js 18+** — https://nodejs.org/

### 2. 解压/安装
将本软件解压或安装到任意目录。

### 3. 双击启动
```
双击 start.bat
```
首次运行会自动安装依赖（约3-5分钟）。

### 4. 打开浏览器
访问 http://localhost:3000

---

## 系统要求
- **操作系统**: Windows 11 on ARM (骁龙X Elite/X Plus)
- **处理器**: ARM64
- **内存**: 8GB+
- **磁盘**: 500MB+ (含依赖)

## 功能特性
- **8大智能体协同** — 锦衣卫体系全链路协作
- **四色卡片分类** — 蓝(事实)/绿(解释)/黄(风险)/红(行动)
- **文档智能分析** — PDF/DOCX/TXT 一键解析
- **向量语义搜索** — AI驱动的精准检索
- **NPU硬件加速** — 骁龙X Elite NPU推理优化

---
_{APP_NAME} | 基于骁龙X Elite NPU优化的企业级AI知识管理解决方案_
"""

    (BUILD_DIR / "README_安装说明.md").write_text(readme, encoding='utf-8')


def create_license():
    """创建许可证"""
    license_text = f"""{APP_NAME} 许可协议
============================

版权所有 (C) 2025 知易团队。保留所有权利。

本软件为参赛作品，仅供学习和评估用途。

使用本软件即表示您同意以下条款：

1. 本软件按"原样"提供，不提供任何明示或暗示的担保。

2. 开发者不对因使用本软件造成的任何损失承担责任。

3. 本软件使用的第三方库请参见各库的许可协议。

4. AI模型相关功能依赖于高通骁龙X Elite平台的NPU硬件加速。

如需商业使用，请联系开发团队。

---
{APP_NAME} v{APP_VERSION}
基于骁龙X Elite NPU优化的企业级AI知识管理解决方案
"""
    (BUILD_DIR / "LICENSE.txt").write_text(license_text, encoding='utf-8')


def step_4_nsis(total_size: float):
    """Step 4: 生成 NSIS 脚本"""
    print("\n" + "=" * 60)
    print("[Step 4/5] 生成 NSIS 安装脚本...")
    print("=" * 60)

    # 查找图标
    icon_candidates = [
        PROJECT_ROOT / "assets" / "icon.ico",
        PROJECT_ROOT / "favicon.ico",
    ]
    icon_path = None
    for ic in icon_candidates:
        if ic.exists():
            icon_path = ic
            break

    icon_line = f'!define MUI_ICON "{icon_path}"' if icon_path else '; !define MUI_ICON (无图标)'
    
    estimated = int(total_size / 1024 / 1024 * 1.15)

    nsis_script = f"""; {APP_NAME} - NSIS 安装脚本
; 平台: Windows on ARM64 (骁龙X Elite)
; 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}

!include "MUI2.nsh"

Name "{APP_NAME}"
OutFile "{OUTPUT_DIR / (INSTALLER_NAME + '.exe')}"
InstallDir "$PROGRAMFILES64\\{APP_NAME}"
InstallDirRegKey HKCU "Software\\{APP_NAME}" ""
RequestExecutionLevel admin

{icon_line}
!define MUI_UNICON "${{NSISDIR}}\\Contrib\\Graphics\\Icons\\modern-uninstall.ico"

!define MUI_WELCOMEPAGE_TITLE "欢迎使用{APP_NAME}"
!define MUI_WELCOMEPAGE_TEXT "本程序将为您安装{APP_NAME}。$\\r$\\n$\\r$\\n基于骁龙X Elite NPU优化的企业级AI知识管理解决方案。$\\r$\\n$\\r$\\n点击【下一步】继续安装。"
!define MUI_HEADERIMAGE
!define MUI_ABORTWARNING

!define MUI_FINISHPAGE_TITLE "安装完成！"
!define MUI_FINISHPAGE_RUN "$INSTDIR\\start.bat"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动{APP_NAME}"
!define MUI_FINISHPAGE_LINK "访问项目仓库"
!define MUI_FINISHPAGE_LINK_URL "https://gitee.com/anbeime/zhiyi"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "{BUILD_DIR / 'LICENSE.txt'}"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "{APP_NAME}" SecMain
    SetOutPath "$INSTDIR"
    File /r "{BUILD_DIR}\\*.*"
    
    CreateShortCut "$DESKTOP\\{APP_NAME}.lnk" "$INSTDIR\\start.bat"
    
    CreateDirectory "$SMPROGRAMS\\{APP_NAME}"
    CreateShortCut "$SMPROGRAMS\\{APP_NAME}\\启动.lnk" "$INSTDIR\\start.bat"
    CreateShortCut "$SMPROGRAMS\\{APP_NAME}\\停止.lnk" "$INSTDIR\\stop.bat"
    CreateShortCut "$SMPROGRAMS\\{APP_NAME}\\卸载.lnk" "$INSTDIR\\uninstall.exe"
    
    WriteRegStr HKCU "Software\\{APP_NAME}" "" $INSTDIR
    WriteUninstall "$INSTDIR\\uninstall.exe"
    
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}" \\
        "DisplayName" "{APP_NAME}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}" \\
        "UninstallString" "$\"$INSTDIR\\uninstall.exe$\""
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}" \\
        "DisplayIcon" "$\"$INSTDIR\\start.bat$\""
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}" \\
        "Publisher" "知易团队"
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}" \\
        "EstimatedSize" "{estimated}"
SectionEnd

Section "Uninstall"
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\\{APP_NAME}.lnk"
    RMDir /r "$SMPROGRAMS\\{APP_NAME}"
    DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}"
    DeleteRegKey HKCU "Software\\{APP_NAME}"
SectionEnd
"""

    nsis_path = BUILD_DIR / "installer.nsi"
    nsis_path.write_text(nsis_script, encoding='utf-8')
    log(f"[OK] {nsis_path}")

    # 尝试编译 NSIS
    log("尝试编译 NSIS...")
    nsis_result = run_cmd(["makensis", str(nsis_path)], check=False)

    installer_exe = OUTPUT_DIR / f"{INSTALLER_NAME}.exe"
    if installer_exe.exists():
        size_mb = installer_exe.stat().st_size / 1024 / 1024
        log(f"NSIS 编译成功! {installer_exe.name} = {size_mb:.1f} MB")
        return installer_exe, size_mb
    else:
        log("[WARN] NSIS 编译失败或 NSIS 未安装")
        log("       请手动安装 NSIS: https://nsis.sourceforge.io/Download")
        log(f"       或运行: makensis {nsis_path}")
        return None, 0


def step_5_zip():
    """Step 5: 生成 ZIP 便携版"""
    print("\n" + "=" * 60)
    print("[Step 5/5] 生成 ZIP 便携版...")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = OUTPUT_DIR / f"{APP_NAME}_ARM64_Portable.zip"

    if zip_path.exists():
        zip_path.unlink()

    file_count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(BUILD_DIR):
            # 跳过不需要的
            dirs[:] = [d for d in dirs if d not in ('__pycache__', '.git', 'build')]
            
            for f in files:
                fpath = os.path.join(root, f)
                arcname = os.path.relpath(fpath, BUILD_DIR)
                zf.write(fpath, arcname)
                file_count += 1

    size_mb = zip_path.stat().st_size / 1024 / 1024
    log(f"[OK] {zip_path.name}  ({size_mb:.1f} MB, {file_count} files)")
    return zip_path, size_mb


def main():
    print("=" * 60)
    print(f"  {APP_NAME} - ARM64 安装包构建工具 v3")
    print(f"  平台: {platform.machine()} (Python {platform.python_version()})")
    print(f"  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    import platform
    arch = platform.machine()
    if 'arm' not in arch.lower() and 'aarch64' not in arch.lower():
        log(f"[WARN] 当前架构是 {arch}，不是 ARM64!")
        log("       生成的 exe 只能在对应架构上运行")

    total_start = time.time()

    # Step 1: PyInstaller 打包后端
    exe_path, exe_size = step_1_pyinstaller()

    # Step 2: 构建前端
    frontend_dir, frontend_size = step_2_frontend()

    # Step 3: 组装
    total_size, file_count = step_3_assemble(exe_path, frontend_dir, exe_size, frontend_size)

    # Step 4: NSIS
    installer_exe, installer_size = step_4_nsis(total_size)

    # Step 5: ZIP
    zip_path, zip_size = step_5_zip()

    # 最终报告
    elapsed = time.time() - total_start

    print("\n" + "=" * 60)
    print("  构建完成!")
    print("=" * 60)
    print()
    print(f"  组件大小:")
    print(f"    后端 exe:        {exe_size:>8.1f} MB")
    if frontend_size > 0:
        print(f"    前端静态文件:    {frontend_size:>8.1f} MB")
    print(f"    安装包内容总计:  {total_size/1024/1024:>8.1f} MB ({file_count} files)")
    print()
    print(f"  输出文件:")
    if installer_exe and installer_exe.exists():
        print(f"    .exe 安装程序:   {installer_size:>8.1f} MB  ← {installer_exe.name}")
    print(f"    .zip 便携版:     {zip_size:>8.1f} MB  ← {zip_path.name}")
    print()
    print(f"  总耗时: {elapsed:.0f} 秒")
    print(f"  输出位置: {OUTPUT_DIR}")
    print()

    if installer_size > 0 and installer_size <= 200:
        print(f"  .exe 安装程序 {installer_size:.1f}MB < 200MB 可直接提交!")
    elif installer_size > 200:
        print(f"  .exe 安装程序 {installer_size:.1f}MB > 200MB 请上传夸克网盘")
    elif zip_size <= 200:
        print(f"  .zip 便携版 {zip_size:.1f}MB < 200MB 可直接提交!")


if __name__ == "__main__":
    main()
