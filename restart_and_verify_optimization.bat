@echo off
echo ========================================
echo NPU Optimization Restart and Verify
echo ========================================
echo.

echo [1/3] Stopping backend service...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *backend*" 2>nul
timeout /t 2 /nobreak >nul
echo Backend service stopped
echo.

echo [2/3] Starting optimized backend...
start "AntiNet Backend" cmd /k "cd /d %~dp0 && venv_arm64\Scripts\activate && python backend\main.py"
echo Waiting for backend to start...
timeout /t 10 /nobreak >nul
echo Backend service started
echo.

echo [3/3] Running performance verification...
echo.
venv_arm64\Scripts\python.exe verify_npu_optimization.py
echo.

echo ========================================
echo Verification Complete
echo ========================================
echo.
pause
