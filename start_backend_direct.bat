@echo off
REM 启动后端服务（使用ARM64虚拟环境）

echo ========================================
echo   启动后端服务（端口8000）
echo ========================================
echo.

if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 未找到虚拟环境 venv_arm64
    pause
    exit /b 1
)

echo 正在启动后端服务...
echo 服务日志将保存到 backend_run.log
echo.
echo 请按 Ctrl+C 停止服务
echo.

venv_arm64\Scripts\python.exe backend\main.py
