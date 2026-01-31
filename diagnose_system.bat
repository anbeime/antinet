@echo off
chcp 65001 >nul
echo ========================================
echo Antinet 系统完整诊断
echo ========================================
echo.

echo [步骤1] 检查后端服务...
powershell -Command "if (Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue) { Write-Host '✓ 后端服务运行中' -ForegroundColor Green } else { Write-Host '✗ 后端服务未运行，正在启动...' -ForegroundColor Yellow; Start-Process cmd -ArgumentList '/k','cd /d C:\test\antinet\backend && python main.py' -WindowStyle Normal; Start-Sleep -Seconds 10 }"
echo.

echo [步骤2] 打开诊断页面...
start "" "C:\test\antinet\system_diagnosis.html"
echo.

echo ========================================
echo 诊断页面已打开
echo 请在浏览器中点击"开始全面诊断"按钮
echo ========================================
echo.
echo 按任意键继续...
pause >nul
