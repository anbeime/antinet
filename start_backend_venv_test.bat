@echo off
REM 启动后端服务 - 使用ARM64虚拟环境

echo ====================================
echo 启动 Antinet 后端服务
echo ====================================

REM 设置项目路径
set PROJECT_DIR=c:\test\antinet
set BACKEND_DIR=%PROJECT_DIR%\backend

REM 激活虚拟环境
call c:\test\antinet\venv_arm64\Scripts\activate.bat

REM 切换到backend目录
cd /d %BACKEND_DIR%

echo 当前目录: %CD%
echo Python 路径: %PYTHON_PATH%

REM 启动后端
echo.
echo 正在启动后端服务...
echo.

python main.py

pause
