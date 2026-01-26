@echo off
REM OpenCode with GLM-4.7-Flash Pre-configured
REM Auto-set API Key via environment variable

echo ========================================
echo   OpenCode + GLM-4.7-Flash
echo ========================================
echo.

REM Set Node.js path
set "NODE_PATH=C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64"

REM Add to PATH
set "PATH=%NODE_PATH%;%PATH%"

REM Set Zhipu API Key
set "ZHIPU_API_KEY=d68afc047d2b47179fccca96e52ca57c.XDODZVHpC70KMfos"

REM Set default model
set "OPENCODE_MODEL=zhipu/glm-4.7-flash"

echo [INFO] Model: GLM-4.7-Flash
echo [INFO] Provider: Zhipu AI
echo [INFO] API Key: Configured
echo.
echo Starting OpenCode...
echo.

REM Start OpenCode
cd /d "%~dp0"
"%NODE_PATH%\opencode.cmd"

pause
