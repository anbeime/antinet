@echo off
echo ========================================
echo   启动 Antinet 后端服务 (NPU模式)
echo ========================================
echo.

cd /d C:\test\antinet

REM 激活虚拟环境
if exist "venv_arm64\Scripts\activate.bat" (
    echo [INFO] 激活 ARM64 虚拟环境...
    call venv_arm64\Scripts\activate.bat
) else (
    echo [ERROR] 未找到虚拟环境 venv_arm64
    echo [INFO] 请先运行 fix_python_env.bat 修复环境
    pause
    exit /b 1
)

echo.
echo [INFO] Python 版本:
python --version

echo.
echo [INFO] 快速验证依赖...
python -c "from qai_appbuilder import GenieContext; import fastapi; print('[OK] 核心依赖已安装')" 2>nul
if errorlevel 1 (
    echo [ERROR] 依赖验证失败
    echo [INFO] 请先运行 fix_python_env.bat 修复环境
    pause
    exit /b 1
)

echo.
echo ========================================
echo   启动后端服务
echo ========================================
echo.
echo [INFO] 服务地址: http://localhost:8000
echo [INFO] API 文档: http://localhost:8000/docs
echo [INFO] 健康检查: http://localhost:8000/api/health
echo.
echo [INFO] NPU 模型将自动加载 (预计 10-15 秒)
echo [INFO] 按 Ctrl+C 停止服务
echo.

REM 设置环境变量
set QNN_LOG_LEVEL=INFO
set QNN_DEBUG=0

REM 启动服务
python backend\main.py

pause
