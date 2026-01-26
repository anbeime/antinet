@echo off
REM ========================================
REM   Quick Fix - Restart Services
REM   Fix chat connection issue
REM ========================================

echo.
echo ========================================
echo   Quick Fix - Restarting Services
echo ========================================
echo.

REM Step 1: Stop all services
echo [Step 1/3] Stopping all services...
call stop_all.bat
timeout /t 3 /nobreak >nul
echo [OK] Services stopped
echo.

REM Step 2: Start backend
echo [Step 2/3] Starting backend service...
start "Antinet Backend" cmd /k "cd /d %~dp0 && start_backend.bat"
echo [OK] Backend starting (new window)
echo.
echo Waiting for backend to be ready (10 seconds)...
timeout /t 10 /nobreak >nul

REM Step 3: Start frontend
echo [Step 3/3] Starting frontend service...
start "Antinet Frontend" cmd /k "cd /d %~dp0 && pnpm run dev"
echo [OK] Frontend starting (new window)
echo.

echo ========================================
echo   Services Restarted!
echo ========================================
echo.
echo Please wait 10-15 seconds, then:
echo   1. Open browser: http://localhost:3000
echo   2. Hard refresh: Ctrl+Shift+R
echo   3. Click chat icon (bottom right)
echo   4. Test with: "Antinet是什么？"
echo.
echo If still showing "模拟模式":
echo   1. Check backend window for errors
echo   2. Try: http://localhost:8000/api/health
echo   3. Run: health_check.bat
echo.
pause
