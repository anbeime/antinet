@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Check Python venv
if not exist "%~dp0venv_arm64\Scripts\python.exe" (
    echo [ERROR] Python venv not found at %~dp0venv_arm64
    pause
    exit /b 1
)

REM Check node_modules
if not exist "%~dp0node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%~dp0"
    call pnpm install
)

REM Set common paths
set "QNN_LIB_PATH=%~dp0ai-engine-direct-helper-main\samples\qai_libs\QAIRT_Runtime\aarch64-windows-msvc"
set "GENIE_SERVICE_DIR=%~dp0ai-engine-direct-helper-main\samples\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73"
set "MODEL_DIR=%~dp0models\qwen2.5vl3b-8380-2.42"

echo.
echo ========================================
echo   Starting All Services
echo ========================================
echo.

REM [1/3] Start Vision Model Service (direct GenieAPIService.exe)
echo [1/3] Starting Vision Model Service (port 8910)...
echo       Model: %MODEL_DIR%
echo.
start "Vision Model (8910)" cmd /k "cd /d "%GENIE_SERVICE_DIR%" && set PATH=%QNN_LIB_PATH%;%%PATH%% && set QNN_BACKEND_PATH=%QNN_LIB_PATH% && GenieAPIService.exe -c "%MODEL_DIR%\config.json" -l -p 8910 -d 3"

timeout /t 5 /nobreak >nul

REM [2/3] Start Backend
echo [2/3] Starting Backend Server (port 8000)...
echo.
start "Backend (8000)" cmd /k "cd /d "%~dp0backend" && set PATH=%QNN_LIB_PATH%;%%PATH%% && set QNN_BACKEND_PATH=%QNN_LIB_PATH% && set QNN_LOG_LEVEL=DEBUG && set VISION_MODEL_URL=http://127.0.0.1:8910 && "%~dp0venv_arm64\Scripts\python.exe" main.py"

timeout /t 3 /nobreak >nul

REM [3/3] Start Frontend
echo [3/3] Starting Frontend Server (port 3000)...
echo.
start "Frontend (3000)" cmd /k "cd /d "%~dp0" && pnpm dev"

echo.
echo ========================================
echo   All Services Started
echo ========================================
echo.
echo   Vision Model:  http://localhost:8910
echo   Backend:       http://localhost:8000
echo   API Docs:      http://localhost:8000/docs
echo   Frontend:      http://localhost:3000
echo.
echo   Note: Vision model needs 15-30s to initialize
echo         Wait for 'Model loaded successfully'
echo.
echo ========================================

timeout /t 10 /nobreak >nul
start http://localhost:3000

pause
