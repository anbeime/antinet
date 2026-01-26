@echo off
REM OpenCode Web Launcher

echo ========================================
echo   OpenCode Web Interface
echo ========================================
echo.

REM Set Node.js path
set "NODE_PATH=C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64"

REM Add to current session PATH
set "PATH=%NODE_PATH%;%PATH%"

echo [INFO] Starting OpenCode Web interface...
echo [INFO] Browser will open automatically
echo.

REM Start OpenCode Web
cd /d "%~dp0"
opencode web

pause
