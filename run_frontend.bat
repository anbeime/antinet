@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Zhiyi Frontend Only
echo ========================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call pnpm install
)

echo.
echo Starting Frontend (port 5173)...
echo   URL: http://localhost:5173
echo.

pnpm dev

pause