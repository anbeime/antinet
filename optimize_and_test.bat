@echo off
chcp 65001 >nul
echo ======================================================================
echo NPU Performance Optimization - Complete Workflow
echo ======================================================================
echo.

echo [Step 1/4] Applying BURST mode patch...
python apply_burst_patch.py
if errorlevel 1 (
    echo [ERROR] Failed to apply patch
    pause
    exit /b 1
)
echo [OK] Patch applied successfully
echo.

echo [Step 2/4] Stopping existing backend...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *backend*" 2>nul
timeout /t 2 /nobreak >nul
echo [OK] Backend stopped
echo.

echo [Step 3/4] Starting optimized backend...
start "AntiNet Backend" cmd /k "cd /d %~dp0 && venv_arm64\Scripts\activate && python backend\main.py"
echo [INFO] Waiting for backend to initialize (15 seconds)...
timeout /t 15 /nobreak >nul
echo [OK] Backend started
echo.

echo [Step 4/4] Running performance test...
echo.
venv_arm64\Scripts\python.exe test_optimized_performance.py
echo.

echo ======================================================================
echo Optimization workflow complete
echo ======================================================================
echo.
echo Check the test results above
echo If tests passed, optimization is successful!
echo.
pause
