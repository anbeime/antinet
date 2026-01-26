@echo off
REM ========================================
REM   Antinet Stop Services Script
REM   Stop all frontend and backend services
REM ========================================

echo.
echo ========================================
echo   Antinet - Stop Services
echo ========================================
echo.

echo [Check] Finding running services...
echo.

REM Stop Python backend processes
echo [Process] Stopping backend service (Python)...
tasklist | findstr /i "python.exe" >nul 2>&1
if not errorlevel 1 (
    REM Find process listening on port 8000
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
        echo   - Found process PID: %%a
        taskkill /F /PID %%a >nul 2>&1
        if not errorlevel 1 (
            echo   [OK] Stopped backend service PID: %%a
        )
    )
) else (
    echo   [Info] No running backend service found
)
echo.

REM Stop Node.js frontend processes
echo [Process] Stopping frontend service (Node.js)...
tasklist | findstr /i "node.exe" >nul 2>&1
if not errorlevel 1 (
    REM Find process listening on port 3000
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        echo   - Found process PID: %%a
        taskkill /F /PID %%a >nul 2>&1
        if not errorlevel 1 (
            echo   [OK] Stopped frontend service PID: %%a
        )
    )
) else (
    echo   [Info] No running frontend service found
)
echo.

REM Cleanup: Stop all Antinet related command windows
echo [Cleanup] Stopping related command windows...
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq Antinet*" /NH 2^>nul') do (
    echo   - Stopping window process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo.

REM Verify ports are released
echo [Verify] Checking port status...
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   [OK] Port 8000 released
) else (
    echo   [WARN] Port 8000 still in use
)

netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   [OK] Port 3000 released
) else (
    echo   [WARN] Port 3000 still in use
)
echo.

echo ========================================
echo   Stop Complete!
echo ========================================
echo.
echo All Antinet services have been stopped
echo.
echo To restart services, run:
echo   - Quick start: start_all.bat
echo   - Full deploy: deploy_antinet.bat
echo.
pause