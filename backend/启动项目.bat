@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   知易智能知识管家 - 后端服务
echo ========================================
echo.

REM 检查虚拟环境
if not exist "%~dp0..\venv_arm64\Scripts\python.exe" (
    echo [ERROR] Python 虚拟环境不存在: %~dp0..\venv_arm64
    pause
    exit /b 1
)

echo [1/2] Python 环境: venv_arm64
echo.

REM 设置 QNN 库路径
set "QNN_SDK=%~dp0..\QAIRT\2.42.0.251225\lib\aarch64-windows-msvc"
set "QAIRT_RUNTIME=%~dp0..\ai-engine-direct-helper-main\samples\qai_libs\QAIRT_Runtime\aarch64-windows-msvc"
set "PATH=%QNN_SDK%;%QAIRT_RUNTIME%;%PATH%"

echo [2/2] 启动后端服务 (端口 8000)...
echo   API: http://localhost:8000
echo   文档: http://localhost:8000/docs
echo.

"%~dp0..\venv_arm64\Scripts\python.exe" main.py

pause
