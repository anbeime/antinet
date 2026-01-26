@echo off
chcp 65001 >nul
echo ========================================
echo Antinet 快速修复和启动
echo ========================================
echo.

cd /d "%~dp0"

echo [步骤 1/5] 清理 CodeBuddy SDK 依赖...
if exist "backend\routes\codebuddy_chat_routes.py" (
    if not exist "backend\routes\codebuddy_chat_routes.py.disabled" (
        echo 禁用 codebuddy_chat_routes.py...
        ren "backend\routes\codebuddy_chat_routes.py" "codebuddy_chat_routes.py.disabled"
        echo ✓ 已禁用
    ) else (
        echo ✓ 已经禁用
    )
) else (
    echo ✓ 文件不存在或已禁用
)
echo.

echo [步骤 2/5] 检查虚拟环境...
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [错误] 虚拟环境不存在: venv_arm64
    echo 请先运行 deploy_antinet.bat 创建虚拟环境
    pause
    exit /b 1
)
echo ✓ 虚拟环境存在
echo.

echo [步骤 3/5] 激活虚拟环境...
call venv_arm64\Scripts\activate.bat
if errorlevel 1 (
    echo [错误] 虚拟环境激活失败
    pause
    exit /b 1
)
echo ✓ 虚拟环境已激活
echo.

echo [步骤 4/5] 检查 Python 环境...
python --version
echo.

echo [步骤 5/5] 启动后端服务...
echo.
echo ========================================
echo 正在启动 Antinet 后端服务...
echo ========================================
echo.
echo 服务地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

cd backend
python main.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo [错误] 后端服务启动失败
    echo ========================================
    echo.
    echo 请检查上面的错误信息
    echo.
    pause
)
