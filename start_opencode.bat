@echo off
REM OpenCode Launcher
REM Auto-configure PATH and start OpenCode

echo ========================================
echo   OpenCode Launcher
echo ========================================
echo.

REM Set Node.js path
set "NODE_PATH=C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64"

REM Add to current session PATH
set "PATH=%NODE_PATH%;%PATH%"

echo [INFO] Node.js path: %NODE_PATH%
echo [INFO] Checking OpenCode installation...

REM Check if OpenCode is available
where opencode >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] OpenCode found
    opencode --version
    echo.
) else (
    echo [ERROR] OpenCode not found
    pause
    exit /b 1
)

echo ========================================
echo   Starting OpenCode...
echo ========================================
echo.
echo Tips: 
echo   - First time: run /connect to configure AI model
echo   - Type /help for help
echo   - Press Ctrl+C to exit
echo.

REM Start OpenCode
cd /d "%~dp0"
opencode

pause
