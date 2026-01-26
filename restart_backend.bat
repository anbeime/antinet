@echo off
echo ========================================
echo   Restarting Antinet Backend
echo ========================================
echo.

echo [INFO] Stopping existing Python processes...
taskkill /F /IM python.exe 2>nul
if errorlevel 1 (
    echo [INFO] No Python processes running
) else (
    echo [OK] Python processes stopped
)

echo.
echo [INFO] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Starting backend service...
cd /d C:\test\antinet
start cmd /k "start_backend_venv.bat"

echo.
echo [OK] Backend service restarted
echo [INFO] Check the new window for service status
echo.
pause
