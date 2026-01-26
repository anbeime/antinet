@echo off
cd /d %~dp0..
echo [INFO] 使用 ARM64 虚拟环境启动后端服务...
echo [INFO] 虚拟环境路径: %CD%\venv_arm64
if not exist "venv_arm64\Scripts\python.exe" (
    echo [ERROR] 虚拟环境不存在: %CD%\venv_arm64
    exit /b 1
)

echo [INFO] 停止现有 Python 进程...
taskkill /F /IM python.exe /T 2>nul

echo [INFO] 启动后端服务...
start /B venv_arm64\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info > backend_safe.log 2>&1

echo [INFO] 等待 10 秒服务启动...
timeout /t 10 /nobreak >nul

echo [INFO] 检查日志...
type backend_safe.log | findstr /I "error fail exception started" | head -20

echo [INFO] 测试健康检查...
curl http://localhost:8000/api/health 2>&1

echo [INFO] 服务启动完成，日志保存在 backend_safe.log