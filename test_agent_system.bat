@echo off
REM 8-Agent 系统测试脚本
REM 用于验证 8-Agent 系统的完整功能

echo.
echo ========================================
echo   8-Agent 系统测试
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在
    echo 请确保项目根目录下有 venv_arm64 虚拟环境
    pause
    exit /b 1
)

REM 检查后端是否运行
echo [检查] 检测后端服务状态...
curl -s http://localhost:8000/api/health > nul 2>&1
if errorlevel 1 (
    echo [ERROR] 后端服务未运行
    echo 请先启动后端: python backend\main.py
    pause
    exit /b 1
)

echo [OK] 后端服务正在运行
echo.

REM 运行测试
echo [运行] 开始测试 8-Agent 系统...
echo.
venv_arm64\Scripts\python.exe test_agent_system.py

echo.
echo ========================================
echo   测试完成
echo ========================================
pause
