@echo off
chcp 65001 >nul
title Antinet Desktop Launcher
echo ==========================================
echo   Antinet Smart Knowledge Manager
echo ==========================================
echo.

set "VENV_PYTHON=C:\test\antinet\venv_arm64\Scripts\python.exe"

if not exist "%VENV_PYTHON%" (
    echo [ERROR] Virtual environment not found
    pause
    exit /b 1
)

echo [OK] Virtual environment found
echo.

echo [0/3] Stopping existing services...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 3 /nobreak >nul
echo [OK] Done
echo.

echo [1/3] Starting Backend (port 8000)...
start "Backend-8000" cmd /k "cd /d C:\test\antinet\backend && %VENV_PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 10 /nobreak >nul
echo [OK] Backend started
echo.

echo [2/3] Starting Frontend (port 3000)...
start "Frontend" cmd /k "cd /d C:\test\antinet && pnpm dev"
timeout /t 15 /nobreak >nul
echo [OK] Frontend started
echo.

echo [3/3] Opening browser...
start msedge.exe --app=http://localhost:3000 --window-size=1400,900 2>nul || start http://localhost:3000
echo.

echo ==========================================
echo   App Ready!
echo ==========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo ==========================================
pause
