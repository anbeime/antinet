@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Zhiyi Quick Start
echo ========================================
echo.

REM Kill existing processes
echo [0/6] Killing old processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM GenieAPIService.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Clear Python bytecode cache to ensure fresh code
echo [0.5/6] Clearing Python bytecode cache...
if exist "%~dp0backend\__pycache__" rmdir /s /q "%~dp0backend\__pycache__"
if exist "%~dp0backend\routes\__pycache__" rmdir /s /q "%~dp0backend\routes\__pycache__"
if exist "%~dp0backend\conf\__pycache__" rmdir /s /q "%~dp0backend\conf\__pycache__"
if exist "%~dp0backend\agents\__pycache__" rmdir /s /q "%~dp0backend\agents\__pycache__"
if exist "%~dp0backend\api\__pycache__" rmdir /s /q "%~dp0backend\api\__pycache__"
if exist "%~dp0backend\middleware\__pycache__" rmdir /s /q "%~dp0backend\middleware\__pycache__"
if exist "%~dp0backend\services\__pycache__" rmdir /s /q "%~dp0backend\services\__pycache__"
echo [OK] Bytecode cache cleared

REM Check Python venv
if not exist "C:\D\zhiyi\venv_arm64\Scripts\python.exe" (
    echo [ERROR] Python venv not found!
    pause
    exit /b 1
)
echo [OK] Python venv found

REM Check node_modules
if not exist "%~dp0node_modules" (
    echo [INFO] Installing frontend dependencies...
    call pnpm install
)
echo [OK] Node modules ready

REM ========================================
REM [1/6] Genie AI Engine (port 8910)
REM ========================================
if exist "C:\models\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73\GenieAPIService.exe" (
    echo [1/6] Starting Genie...
    start "Genie" cmd /k "C:\models\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73\GenieAPIService.exe -c C:\models\qwen2.5vl3b-8380-2.42\config.json -l -p 8910 -d 3"
    timeout /t 5 /nobreak >nul
) else (
    echo [1/6] Genie not found, skipping...
)

REM ========================================
REM [2/6] Zhiyi Backend (port 8000)
REM ========================================
echo [2/6] Starting Zhiyi Backend...
@REM start "Zhiyi Backend" cmd /k "C:\D\zhiyi\venv_arm64\Scripts\python.exe C:\D\zhiyi\backend\main.py"
timeout /t 8 /nobreak >nul

REM ========================================
REM [4/6] Zhiyi Frontend (port 3000)
REM ========================================
echo [4/6] Starting Zhiyi Frontend...
start "Zhiyi Frontend" cmd /k "cd /d C:\D\zhiyi && pnpm dev"
timeout /t 5 /nobreak >nul

REM ========================================
REM [5/6] Open browser
REM ========================================
echo [5/6] Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo   All Services Started
echo ========================================
echo.
echo   Genie:     http://localhost:8910

echo   Backend:   http://localhost:8000
echo   Frontend:  http://localhost:3000
echo ========================================
echo.
pause