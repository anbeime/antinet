@echo off
chcp 65001 >nul

echo ========================================
echo   Antinet Demo - Screen Recording
echo ========================================
echo.

echo Step 1: Check virtual environment...
if not exist "venv_arm64\Scripts\python.exe" (
    echo ERROR: ARM64 virtual environment not found
    echo Please ensure venv_arm64 directory exists
    pause
    exit /b 1
)
echo OK: Virtual environment check passed

echo.
echo Step 2: Check qai_appbuilder...
venv_arm64\Scripts\python -c "import qai_appbuilder" 2>nul
if errorlevel 1 (
    echo ERROR: qai_appbuilder not installed
    echo Please install with: venv_arm64\Scripts\python -m pip install qai_appbuilder
    pause
    exit /b 1
)
echo OK: qai_appbuilder installed

echo.
echo Step 3: Check if backend is already running (port 8000)...
netstat -an | findstr ":8000" >nul
if errorlevel 1 (
    echo Backend not running, starting now...
    echo Note: Backend startup takes 30-60 seconds, please wait...
    echo.
    start "Antinet Backend" cmd /k "cd /d c:\test\antinet\backend && ..\venv_arm64\Scripts\python main.py"
    echo OK: Backend service started (new window)
    echo.
    echo Step 4: Wait for backend to be ready (10 seconds)...
    timeout /t 10 /nobreak >nul
) else (
    echo OK: Backend is already running on port 8000
    echo.
    echo Step 4: Skip backend startup (already running)...
)

echo.
echo Step 5: Check backend health...
curl -s http://localhost:8000/api/health
echo.

echo.
echo Step 6: Start frontend dev server (port 5173)...
echo Note: Frontend startup takes 10-20 seconds...
echo.

start "Antinet Frontend" cmd /k "cd /d c:\test\antinet && pnpm dev"
echo OK: Frontend service started (new window)

echo.
echo Step 7: Wait for frontend to be ready (15 seconds)...
timeout /t 15 /nobreak >nul

echo.
echo Step 8: Test intelligent model router...
echo.

venv_arm64\Scripts\python test_model_router.py

echo.
echo ========================================
echo Demo Complete!
echo ========================================
echo.
echo Access URLs:
echo - Frontend: http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo - Health Check: http://localhost:8000/api/health
echo.
echo Press any key to exit...
pause >nul