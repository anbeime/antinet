@echo off
chcp 936 >nul
cd /d "%~dp0"

echo ========================================
echo   Genie Model Service Launcher
echo ========================================
echo.
echo   Available models:
echo.
echo   1. qwen2.5vl3b     (Vision - text+image)
echo   2. Qwen2.0-7B-SSD  (Chat - fast decode)
echo   3. llama3.2-3b     (Chat - lightweight)
echo.
echo   Note: NPU can only run ONE model at a time
echo   Close the GenieAPIService window before switching
echo.

set /p CHOICE="Select model [1-3]: "

if "%CHOICE%"=="1" (
    set "MODEL_DIR=%~dp0models\qwen2.5vl3b-8380-2.42"
    set "MODEL_NAME=Qwen2.5-VL-3B"
) else if "%CHOICE%"=="2" (
    set "MODEL_DIR=%~dp0models\Qwen2.0-7B-SSD-8380-2.34"
    set "MODEL_NAME=Qwen2.0-7B-SSD"
) else if "%CHOICE%"=="3" (
    set "MODEL_DIR=%~dp0models\llama3.2-3b-8380-qnn2.37"
    set "MODEL_NAME=Llama3.2-3B"
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

set "GENIE_SERVICE_DIR=%~dp0ai-engine-direct-helper-main\samples\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73"

echo.
echo [1/3] Check model config: %MODEL_NAME%
if not exist "%MODEL_DIR%\config.json" (
    echo [ERROR] Config not found: %MODEL_DIR%\config.json
    pause
    exit /b 1
)
echo [OK] Model config found

echo [2/3] Check GenieAPIService...
if not exist "%GENIE_SERVICE_DIR%\GenieAPIService.exe" (
    echo [ERROR] GenieAPIService.exe not found: %GENIE_SERVICE_DIR%
    pause
    exit /b 1
)
echo [OK] GenieAPIService found

echo [3/3] Starting %MODEL_NAME% on port 8910...
echo.

set "LAUNCHER=%TEMP%\genie_model_launcher.bat"
echo @echo off > "%LAUNCHER%"
echo cd /d "%GENIE_SERVICE_DIR%" >> "%LAUNCHER%"
echo GenieAPIService.exe -c "%MODEL_DIR%\config.json" -l -p 8910 -d 3 >> "%LAUNCHER%"

start "%MODEL_NAME% - Port 8910" "%LAUNCHER%"

echo.
echo ========================================
echo   Started!
echo   Model: %MODEL_NAME%
echo   API:   http://localhost:8910
echo ========================================
echo.
echo Close the GenieAPIService window to stop.
echo Then re-run this script to switch model.
echo.
pause
