@echo off
chcp 65001 >nul
echo ========================================
echo  启动 Qwen2.5-VL-3B Vision 服务
echo  端口: 8910
echo ========================================
echo.

cd /d C:\ai-engine-direct-helper\samples

echo 正在启动 Vision 服务...
echo 日志文件: C:\test\antinet\vision_service.log
echo.

start "" GenieAPIService\GenieAPIService.exe -c "genie\python\models\qwen2.5vl3b-8380-2.42\config.json" -l

echo.
echo 等待服务启动 (约20秒)...
timeout /t 20 /nobreak >nul

echo.
echo 验证服务状态...
curl -s http://127.0.0.1:8910/v1/models >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Vision 服务启动成功 (端口 8910)
) else (
    echo [FAIL] Vision 服务启动失败，请检查日志
)

echo.
pause
