@echo off
chcp 65001 >nul
echo ========================================
echo Antinet 后端服务启动脚本 (修复版)
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 检查虚拟环境...
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [错误] 虚拟环境不存在: venv_arm64
    echo 请先运行 deploy_antinet.bat 创建虚拟环境
    pause
    exit /b 1
)

echo [2/4] 激活虚拟环境...
call venv_arm64\Scripts\activate.bat
if errorlevel 1 (
    echo [错误] 虚拟环境激活失败
    pause
    exit /b 1
)

echo [3/4] 检查 Python 版本...
python --version

echo [4/4] 启动后端服务...
echo.
echo 从 backend 目录启动服务...
cd backend
python main.py

if errorlevel 1 (
    echo.
    echo [错误] 后端服务启动失败
    echo 请检查上面的错误信息
    pause
)
