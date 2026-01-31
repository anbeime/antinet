@echo off
chcp 65001 >nul
echo ========================================
echo 前端白屏快速诊断
echo ========================================
echo.

echo [1] 检查前端服务...
powershell -Command "if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue) { Write-Host '✓ 前端服务运行中' -ForegroundColor Green } else { Write-Host '✗ 前端服务未运行' -ForegroundColor Red }"

echo [2] 检查后端服务...
powershell -Command "if (Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue) { Write-Host '✓ 后端服务运行中' -ForegroundColor Green } else { Write-Host '✗ 后端服务未运行' -ForegroundColor Red }"

echo [3] 测试后端API...
curl -s http://localhost:8000/api/chat/health 2>nul
echo.

echo [4] 检查Home.tsx中的关键代码...
findstr /n "color.*card.card_type" "C:\test\antinet\src\pages\Home.tsx" 2>nul
findstr /n "type.*card.card_type" "C:\test\antinet\src\pages\Home.tsx" 2>nul

echo.
echo ========================================
echo 请打开浏览器按F12查看Console错误
echo 然后告诉我具体的错误信息
echo ========================================
pause
