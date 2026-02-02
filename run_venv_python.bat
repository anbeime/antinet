@echo off
REM ====================================
REM Antinet - 虚拟环境中运行 Python 脚本
REM ====================================
REM 用法：run_venv_python.bat script.py [arguments]
REM 示例：run_venv_python.bat test_api.py
REM ====================================

if "%1"=="" (
    echo 用法：run_venv_python.bat script.py [arguments]
    echo.
    echo 示例：
    echo   run_venv_python.bat test_api.py
    echo   run_venv_python.bat backend\diagnose.py
    echo.
    pause
    exit /b 1
)

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 虚拟环境不存在！
    echo 请运行 install_venv_deps.bat 创建并安装依赖
    pause
    exit /b 1
)

REM 使用虚拟环境的 Python 运行脚本
venv_arm64\Scripts\python.exe %*

if %errorlevel% neq 0 (
    echo.
    echo [错误] 脚本执行失败，退出码：%errorlevel%
    pause
    exit /b 1
)
