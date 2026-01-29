@echo off
chcp 65001 >nul
echo ========================================
echo Antinet 完整系统测试
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 检查后端服务...
netstat -ano | findstr ":8000" >nul
if %errorlevel% == 0 (
    echo ✓ 后端服务运行中
) else (
    echo ✗ 后端服务未运行
    echo   启动命令: venv_arm64\Scripts\python.exe backend\main.py
    pause
    exit /b 1
)

echo.
echo [2/5] 检查前端服务...
netstat -ano | findstr ":3001" >nul
if %errorlevel% == 0 (
    echo ✓ 前端服务运行中 (端口 3001)
) else (
    echo ✗ 前端服务未运行
    echo   启动命令: pnpm dev
    pause
    exit /b 1
)

echo.
echo [3/5] 测试后端 API...
venv_arm64\Scripts\python.exe backend\test_all_apis.py
if %errorlevel% neq 0 (
    echo.
    echo ✗ 部分 API 测试失败
    pause
    exit /b 1
)

echo.
echo [4/5] 检查数据库...
if exist "backend\data\antinet.db" (
    echo ✓ 数据库文件存在
) else (
    echo ✗ 数据库文件不存在
    pause
    exit /b 1
)

echo.
echo [5/5] 打开浏览器...
start "" "http://localhost:3001"

echo.
echo ========================================
echo ✓ 所有检查通过！
echo ========================================
echo.
echo 系统已就绪，请在浏览器中测试以下功能：
echo.
echo 1. 知识卡片管理 (✓ 已验证)
echo 2. GTD 任务管理 (✓ 后端就绪)
echo 3. PDF 智能分析 (✓ 完全可用)
echo 4. 数据分析
echo 5. Agent 系统
echo 6. 技能中心
echo.
echo 访问地址: http://localhost:3001
echo API 文档: http://localhost:8000/docs
echo.
pause
