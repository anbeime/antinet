@echo off
chcp 65001 >nul
echo ========================================
echo  Start Qwen2.5-VL-3B Vision Service
echo  Port: 8910
echo ========================================
echo.

REM Check if service is already running
powershell -Command "$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 8910 -WarningAction SilentlyContinue; if ($conn.TcpTestSucceeded) { Write-Host 'Vision service already running (port 8910)'; exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo Service already running, skip startup
    goto :end
)

echo Starting Vision service...
echo Log file: C:\test\antinet\vision_service.log
echo.

powershell -Command "cd 'C:\ai-engine-direct-helper\samples\genie\python'; Start-Process -FilePath 'C:\test\antinet\venv_arm64\Scripts\python.exe' -ArgumentList 'GenieAPIService.py','--modelname','qwen2.5vl3b','--loadmodel','--profile' -WorkingDirectory 'C:\ai-engine-direct-helper\samples\genie\python' -RedirectStandardOutput 'C:\test\antinet\vision_service.log' -NoNewWindow"

echo.
echo Waiting for service startup (about 30 seconds)...
timeout /t 30 /nobreak >nul

REM Verify service status
echo.
echo Checking service status...
powershell -Command "$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 8910 -WarningAction SilentlyContinue; if ($conn.TcpTestSucceeded) { Write-Host 'OK: Vision service started (port 8910)' } else { Write-Host 'Error: Vision service failed to start, check log' }"

:end
echo.
pause
