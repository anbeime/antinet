@echo off
REM ====================================
REM Antinet - 使用虚拟环境启动后端
REM ====================================
echo.
echo ========================================
echo Antinet 智能知识管家 - 后端启动（虚拟环境）
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 虚拟环境不存在！
    echo 请运行 install_venv_deps.bat 创建并安装依赖
    pause
    exit /b 1
)

echo [信息] 使用虚拟环境：venv_arm64
echo [信息] Python 版本：
venv_arm64\Scripts\python.exe --version
echo.

REM 进入 backend 目录并启动服务
cd /d "%~dp0backend"

echo [启动] 正在启动 FastAPI 服务...
echo [地址] http://localhost:8000
echo [文档] http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务
echo.

..\venv_arm64\Scripts\python.exe main.py
