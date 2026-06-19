@echo off
chcp 65001 >nul
REM 切换到脚本所在目录
cd /d "%~dp0"

echo ========================================
echo   Zhiyi Quick Start (v2)
echo ========================================
echo.

REM 显示当前路径以便调试
echo 当前工作目录: %cd%
echo 脚本所在目录: %~dp0
echo.

REM Kill existing processes
echo [0/6] Killing old processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM GenieAPIService.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM 检查当前目录是否正确
if not exist "venv_arm64\Scripts\python.exe" (
    echo [WARN] 在当前目录未找到venv: %cd%\venv_arm64\
    echo 尝试在 C:\D\zhiyi 中查找...
    
    REM 尝试切换到 C:\D\zhiyi
    cd /d "C:\D\zhiyi"
    echo 切换到目录: %cd%
)

REM Check Python venv
if not exist "venv_arm64\Scripts\python.exe" (
    echo [ERROR] Python venv not found!
    echo 请确保 venv_arm64\Scripts\python.exe 存在
    echo 当前路径: %cd%\venv_arm64\Scripts\python.exe
    pause
    exit /b 1
)
echo [OK] Python venv found at: %cd%\venv_arm64\Scripts\python.exe

REM Check node_modules
if not exist "node_modules" (
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
REM 确保在正确的工作目录启动后端
start "Zhiyi Backend" cmd /k "cd /d backend && ..\venv_arm64\Scripts\python.exe main.py"
timeout /t 8 /nobreak >nul

REM ========================================
REM [3/6] Hermes WS Gateway (port 18119)
REM ========================================
echo [3/6] Starting Hermes WS Gateway...
start "Hermes WS" cmd /k "cd /d backend && ..\venv_arm64\Scripts\python.exe ..\hermes_ws_server.py"
timeout /t 3 /nobreak >nul

REM ========================================
REM [4/6] Zhiyi Frontend (port 3000)
REM ========================================
echo [4/6] Starting Zhiyi Frontend...
start "Zhiyi Frontend" cmd /k "pnpm dev"
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
echo   项目根目录: %cd%
echo   后端:       http://localhost:8000
echo   HermesWS:  ws://localhost:18119
echo   前端:       http://localhost:3000
echo   Genie:     http://localhost:8910
echo ========================================
echo.
pause