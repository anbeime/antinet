@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Antinet - Starting
echo ========================================

:: Set Python path
set "PYTHON=%~dp0venv_arm64\Scripts\python.exe"
if not exist "%PYTHON%" (
    set "PYTHON=python.exe"
)
set "PYTHONPATH=%~dp0;%~dp0backend;%~dp0hermes-agent-main;%~dp0"
set "PYTHONPATH=%~dp0;%~dp0backend;%~dp0"

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found Please install Node.js first.
    pause
    exit /b 1
)

echo [0/4] Stopping old processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM GenieAPIService.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: [1/4] Genie AI Engine
if exist "services\GenieAPIService\GenieAPIService.exe" (
    if exist "services\models\qwen2.5vl3b-8380-2.42\config.json" (
        echo [1/4] Starting Genie AI Engine...
        start "Genie AI" cmd /k "services\GenieAPIService\GenieAPIService.exe -c services\models\qwen2.5vl3b-8380-2.42\config.json -l -p 8910 -d 3"
    ) else (
        echo [1/4] Genie config.json not found, starting without vision model...
        start "Genie AI" cmd /k "services\GenieAPIService\GenieAPIService.exe -l -p 8910 -d 0"
    )
    timeout /t 5 /nobreak >nul
) else (
    echo [1/4] Genie AI Engine not found - AI features disabled
)

:: [2/4] Hermes WS Server
echo [2/4] Starting Hermes WS Server...
start "Hermes WS" cmd /k "%PYTHON% hermes_ws_server.py --port 18119"
timeout /t 3 /nobreak >nul

:: [3/4] Backend
echo [3/4] Starting Backend...
start "Antinet Backend" cmd /k "%PYTHON% backend\main.py"
timeout /t 5 /nobreak >nul

:: [4/4] Frontend
echo [4/4] Starting Frontend...
if exist "static\index.html" (
    start "Antinet Frontend" cmd /k "npx -y serve static -p 3000 --single"
) else (
    start "Antinet Frontend" cmd /k "npx -y vite --host --port 3000"
)
timeout /t 5 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:3000

echo ========================================
echo   Started
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo   - Genie:    http://localhost:8910
echo   - Hermes:   http://localhost:18119
echo ========================================

pause
