@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Zhiyi Backend Only
echo ========================================
echo.

REM Check Python venv
if not exist "%~dp0venv_arm64\Scripts\python.exe" (
    echo [ERROR] Python venv not found: venv_arm64
    pause
    exit /b 1
)

echo Starting Backend (port 8000)...
echo.

cd /d "%~dp0backend"
"%~dp0venv_arm64\Scripts\python.exe" main.py

pause
