@echo off
REM ========================================
REM OpenCode Web 界面启动（完整路径版本）
REM ========================================

echo.
echo ========================================
echo   OpenCode Web 启动中...
echo ========================================
echo.

REM 直接使用完整路径
set "OPENCODE_CMD=C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64\opencode.cmd"

if not exist "%OPENCODE_CMD%" (
    echo [ERROR] OpenCode 未找到！
    pause
    exit /b 1
)

echo [OK] 启动 Web 界面...
echo [INFO] 浏览器将自动打开
echo.

cd /d "%~dp0"
"%OPENCODE_CMD%" web

pause
