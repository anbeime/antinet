@echo off
REM 后台启动后端服务 - 使用ARM64虚拟环境

echo ====================================
echo 后台启动 Antinet 后端服务
echo ====================================

REM 激活虚拟环境
call c:\test\antinet\venv_arm64\Scripts\activate.bat

REM 切换到backend目录
cd /d c:\test\antinet\backend

echo 当前目录: %CD%
echo 虚拟环境: %VIRTUAL_ENV%
echo.
echo 正在启动后端服务（后台运行）...
echo 服务地址: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务
echo ====================================

REM 启动后端
start /B python main.py
