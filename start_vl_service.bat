@echo off
chcp 65001 >nul
echo ========================================
echo  Start Qwen2.5-VL-3B Vision Service
echo  Using: genie-vl-service (C++ native)
echo  Port: 8910
echo ========================================
echo.

REM Check if service is already running
powershell -Command "$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 8910 -WarningAction SilentlyContinue; if ($conn.TcpTestSucceeded) { Write-Host '[OK] Vision service already running (port 8910)'; exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo Service already running, skip startup
    goto :end
)

REM Use project-local genie-vl-service (copied from ai-engine-direct-helper)
set "VL_DIR=%~dp0genie-vl-service"
set "VL_CONFIG=%VL_DIR%\config\Qwen2.5-VL-3B\config.json"

if not exist "%VL_DIR%\GenieAPIService.exe" (
    echo [ERROR] GenieAPIService.exe not found in %VL_DIR%
    pause
    exit /b 1
)

if not exist "%VL_CONFIG%" (
    echo [ERROR] VL config not found: %VL_CONFIG%
    pause
    exit /b 1
)

echo [INFO] VL Service directory: %VL_DIR%
echo [INFO] VL Config: %VL_CONFIG%
echo [INFO] Starting on port 8910 ...
echo.

REM Start GenieAPIService from genie-vl-service directory
REM -c : VL config (type: vl-qnn-8380-2.42, model-path points to C:/model/models_2.42/...)
REM -l : load model on startup
REM -p : listen port
start "" /D "%VL_DIR%" "%VL_DIR%\GenieAPIService.exe" -c "%VL_CONFIG%" -l -p 8910

echo.
echo Waiting for service startup (about 30 seconds)...
timeout /t 30 /nobreak >nul

REM Verify service status
echo.
echo Checking service status...
powershell -Command "$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 8910 -WarningAction SilentlyContinue; if ($conn.TcpTestSucceeded) { Write-Host '[OK] Vision service started successfully (port 8910)' } else { Write-Host '[FAIL] Vision service failed to start' }"

:end
echo.
pause
