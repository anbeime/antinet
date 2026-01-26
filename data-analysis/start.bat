@echo off
REM 启动Antinet后端服务 (Windows)

echo 启动Antinet后端服务...

REM 检查虚拟环境
if not exist venv (
    echo 错误: 虚拟环境不存在，请先运行部署脚本
    exit /b 1
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 检查配置文件
if not exist .env (
    echo 错误: .env配置文件不存在，请先运行部署脚本
    exit /b 1
)

REM 创建日志目录
if not exist logs mkdir logs

REM 启动服务
echo 服务启动中...
start /B python main.py > logs\server.log 2>&1

echo 后端服务已启动
echo 日志文件: logs\server.log
echo.
echo 查看日志: type logs\server.log
echo 停止服务: stop.bat
pause
