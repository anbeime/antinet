@echo off
chcp 65001 >nul
echo ========================================
echo Starting Backend and Running Tests
echo ========================================

:: Start Backend
echo [1/3] Starting Backend (AUTO_LOAD_MODEL=False)...
cd /d C:\test\antinet
start /B cmd /c "venv_arm64\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 > backend_test.log 2>&1"

:: Wait for startup
echo [2/3] Waiting for service startup (10s)...
timeout /t 10 /nobreak >nul

:: Check if service is running
echo [3/3] Testing API...
curl -s http://127.0.0.1:8000/api/health -m 5 > nul
if %errorlevel% == 0 (
    echo Health Check: OK
    curl -s http://127.0.0.1:8000/api/health -m 5
    echo.
) else (
    echo Health Check: FAILED
)

echo.
echo Running full test...
venv_arm64\Scripts\python.exe test_frontend_multi_model.py

echo.
echo ========================================
pause
