@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Zhiyi Quick Launcher
echo ========================================
echo.

REM Check Python venv
if not exist "%~dp0venv_arm64\Scripts\python.exe" (
    echo [ERROR] Python venv not found: venv_arm64
    pause
    exit /b 1
)

REM Check node_modules
if not exist "%~dp0node_modules" (
    echo [INFO] Installing frontend dependencies...
    call pnpm install
)

echo.
echo ========================================
echo   Starting Services
echo ========================================
echo.

REM Kill existing processes on ports (more reliable)
powershell -Command "Get-NetTCPConnection -LocalPort 8910,8000,3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 2 /nobreak >nul

REM Check Genie dir
set GENIE_DIR=C:\D\zhiyi\ai-engine-direct-helper-main\samples\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73
set GENIE_MODEL=C:\models\qwen2.5vl3b-8380-2.42\config.json
if not exist "%GENIE_DIR%\GenieAPIService.exe" (
    echo [WARN] GenieAPIService.exe not found, skipping AI engine...
    set GENIE_DIR=
)

REM [1/3] Start Genie AI Engine (port 8910)
if defined GENIE_DIR (
    echo [1/4] Starting Genie AI Engine (port 8910)...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8910 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
    start "Genie AI Engine (8910)" cmd /k "cd /d "%GENIE_DIR%" && GenieAPIService.exe -c "%GENIE_MODEL%" -l -p 8910 -d 3"
    timeout /t 5 /nobreak >nul
    echo   Genie AI Engine started on port 8910
)

REM [X/3] Start Backend
echo [2/4] Starting Backend (port 8000)...
start "Zhiyi Backend (8000)" cmd /k "cd /d "%~dp0backend" && "%~dp0venv_arm64\Scripts\python.exe" main.py"

timeout /t 3 /nobreak >nul

REM [X/3] Start Frontend
echo [3/4] Starting Frontend (port 3000)...
start "Zhiyi Frontend (3000)" cmd /k "cd /d "%~dp0" && pnpm dev"

echo.
echo ========================================
echo   All Services Started
echo ========================================
echo.
if defined GENIE_DIR (
    echo   Genie:     http://localhost:8910
)
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.

timeout /t 3 /nobreak >nul

pause