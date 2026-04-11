@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   知易智能 - 视觉模型服务启动脚本
echo   Qwen2.5-VL-3B
echo ========================================
echo.

REM =============================================
REM 设置视觉模型路径
REM =============================================
set "MODEL_DIR=%~dp0models\qwen2.5vl3b-8380-2.42"
set "GENIE_SERVICE_DIR=%~dp0ai-engine-direct-helper-main\samples\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73"

echo [1/3] 检查视觉模型配置...
if not exist "%MODEL_DIR%\config.json" (
    echo [ERROR] 视觉模型配置文件不存在: %MODEL_DIR%\config.json
    pause
    exit /b 1
)
echo [OK] 视觉模型配置存在
echo.

echo [2/3] 检查 GenieAPIService...
if not exist "%GENIE_SERVICE_DIR%\GenieAPIService.exe" (
    echo [ERROR] GenieAPIService.exe 不存在: %GENIE_SERVICE_DIR%
    pause
    exit /b 1
)
echo [OK] GenieAPIService 存在
echo.

echo [3/3] 启动视觉模型服务 (端口 8910)...
echo.
echo   模型: qwen2.5vl3b-8380-2.42
echo   命令: GenieAPIService.exe -c "%MODEL_DIR%\config.json" -l -p 8910 -d 3
echo.

cd /d "%GENIE_SERVICE_DIR%"
start "Qwen2.5-VL-3B Vision Service" cmd /k "GenieAPIService.exe -c "%MODEL_DIR%\config.json" -l -p 8910 -d 3"

echo 视觉模型服务已在新窗口启动!
echo 初始化约需 10-30 秒，请等待...
echo.
echo ========================================
echo   启动完成!
echo   API 地址: http://localhost:8910
echo   模型: qwen2.5vl3b-8380-2.42
echo ========================================
echo.
echo 提示: 请确保后端服务已启动，然后就可以在聊天机器人中上传图片了!
echo.
pause
