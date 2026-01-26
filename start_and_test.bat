@echo off
chcp 65001 >nul
echo ============================================================
echo NPU 后端启动和测试脚本
echo ============================================================
echo.

REM 检查是否在虚拟环境中
python -c "import sys; exit(0 if 'venv_arm64' in sys.executable else 1)" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 请先激活 ARM64 虚拟环境：
    echo   venv_arm64\Scripts\activate.bat
    pause
    exit /b 1
)

echo [1/4] 验证配置...
python verify_npu_inference.py
if errorlevel 1 (
    echo [ERROR] 配置验证失败
    pause
    exit /b 1
)
echo.

echo [2/4] 启动后端服务...
echo [INFO] 后端将在按需加载模式下启动
echo [INFO] 访问 http://localhost:8000/api/health 检查服务状态
echo [INFO] 按 Ctrl+C 停止服务
echo.
echo ============================================================
echo 正在启动后端...
echo ============================================================
echo.

python -m backend.main

echo.
echo [后端已停止]
pause
