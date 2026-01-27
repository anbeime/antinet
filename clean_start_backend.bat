@echo off
chcp 65001 >nul
echo ========================================
echo Clean Start Backend
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Stopping all Python processes...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo OK - All processes stopped
echo.

echo [2/3] Waiting for port to be released...
timeout /t 2 /nobreak >nul
echo OK - Port should be free now
echo.

echo [3/3] Starting backend service...
echo.
echo ========================================
echo Service URL: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.

cd backend
..\venv_arm64\Scripts\python.exe main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start
    pause
)
