@echo off
REM 启动Antinet后端服务
echo ========================================
echo   Antinet 后端服务启动脚本
echo ========================================
echo.

cd /d "%~dp0backend"

echo 检查Python环境...
python --version
if errorlevel 1 (
    echo [错误] Python未安装或未添加到PATH
    pause
    exit /b 1
)

echo.
echo 检查依赖...
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"
if errorlevel 1 (
    echo [警告] FastAPI未安装，正在安装依赖...
    pip install -r requirements.txt
)

echo.
echo 启动后端服务...
echo 服务地址: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo 按 Ctrl+C 停止服务
echo.

python main.py

pause
