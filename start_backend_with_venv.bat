@echo off
chcp 65001 >nul
echo ==========================================
echo Antinet 后端服务启动脚本 (ARM64虚拟环境)
echo ==========================================
echo.

:: 设置项目路径
set "PROJECT_DIR=c:\test\antinet"
set "VENV_DIR=%PROJECT_DIR%\venv_arm64"
set "PYTHON=%VENV_DIR%\Scripts\python.exe"

:: 检查虚拟环境是否存在
if not exist "%PYTHON%" (
    echo [错误] 虚拟环境未找到: %VENV_DIR%
    echo [错误] 请检查虚拟环境是否正确安装
    exit /b 1
)

echo [1/4] 虚拟环境路径: %VENV_DIR%
echo [2/4] Python 解释器: %PYTHON%
echo.

:: 检查 Python 版本
echo [3/4] 检查 Python 版本...
for /f "delims=" %%i in ('"%PYTHON%" --version') do set PYTHON_VERSION=%%i
echo      %PYTHON_VERSION%

:: 检查关键依赖
echo [4/4] 检查关键依赖...
"%PYTHON%" -c "import fastapi; print('      FastAPI:', fastapi.__version__)" 2>nul || (
    echo [错误] FastAPI 未安装
    exit /b 1
)
"%PYTHON%" -c "import qai_appbuilder; print('      QAI AppBuilder: 已安装')" 2>nul || (
    echo [警告] QAI AppBuilder 未安装
)

echo.
echo ==========================================
echo 启动后端服务...
echo ==========================================
echo.

:: 切换到项目目录
cd /d "%PROJECT_DIR%"

:: 使用虚拟环境的 Python 启动后端
echo [启动] 使用虚拟环境 Python 启动后端服务...
echo.
"%PYTHON%" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo [停止] 后端服务已停止
pause
