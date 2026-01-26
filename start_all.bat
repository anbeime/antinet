@echo off
REM ========================================
REM   Antinet Quick Start Script
REM   Start both frontend and backend
REM   Using Virtual Environment
REM ========================================

echo.
echo ========================================
echo   Antinet - Quick Start
echo   Using Virtual Environment
echo ========================================
echo.

REM Check virtual environment
echo [Check] Checking virtual environment...

set "VENV_PYTHON="
if exist "venv_arm64\Scripts\python.exe" (
    set "VENV_PYTHON=venv_arm64\Scripts\python.exe"
    echo [OK] Found ARM64 virtual environment
) else if exist "venv\Scripts\python.exe" (
    set "VENV_PYTHON=venv\Scripts\python.exe"
    echo [OK] Found x64 virtual environment
) else (
    echo [ERROR] Virtual environment not found
    echo Please create virtual environment first:
    echo   python -m venv venv_arm64
    echo   venv_arm64\Scripts\activate
    echo   pip install -r backend\requirements.txt
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('%VENV_PYTHON% --version 2^>^&1') do (
    echo [OK] Python %%i in virtual environment
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed
    pause
    exit /b 1
)

REM Check frontend dependencies
if not exist "node_modules" (
    echo [ERROR] Frontend dependencies not installed
    echo Please run: pnpm install
    pause
    exit /b 1
)

echo [OK] Environment check passed
echo.

REM Configure NPU environment
echo [Config] Setting up NPU environment...
call set_env.bat >nul 2>&1
echo [OK] NPU environment configured
echo.

REM Start backend service (from project root, not backend directory)
echo [Start] Starting backend service (using virtual environment)...
start "Antinet Backend" cmd /k "cd /d %~dp0 && %VENV_PYTHON% -m backend.main"
echo [OK] Backend service started (new window)
echo.

REM Wait for backend to start
echo [Wait] Waiting for backend to be ready (5 seconds)...
timeout /t 5 /nobreak >nul

REM Start frontend service
echo [Start] Starting frontend service...
start "Antinet Frontend" cmd /k "cd /d %~dp0 && pnpm run dev"
echo [OK] Frontend service started (new window)
echo.

echo ========================================
echo   Startup Complete!
echo ========================================
echo.
echo ----------------------------------------
echo Service Access URLs:
echo ----------------------------------------
echo   Frontend:     http://localhost:3000
echo   NPU Analysis: http://localhost:3000/npu-analysis
echo   Backend API:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo ----------------------------------------
echo.
echo Virtual Environment: %VENV_PYTHON%
echo.
echo Tips:
echo   1. Wait 10-15 seconds before accessing frontend
echo   2. First model load may take extra time
echo   3. Press Ctrl+C to stop services
echo.

REM Wait 5 seconds then open browser
echo [Info] Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo [Done] Browser opened, enjoy Antinet!
echo.
pause