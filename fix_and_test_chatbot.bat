@echo off
chcp 65001 >nul
echo ========================================
echo 修复并重启后端服务
echo ========================================
echo.

echo [1] 停止现有后端进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 停止进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo [2] 启动后端服务...
cd /d C:\test\antinet\backend
start "Antinet Backend" cmd /k "python main.py"

echo [3] 等待服务启动...
timeout /t 8 /nobreak >nul

echo [4] 测试聊天API...
echo.
curl -X POST http://localhost:8000/api/chat/query -H "Content-Type: application/json" -d "{\"query\":\"Antinet\"}"
echo.
echo.

echo ========================================
echo 测试完成
echo 如果看到卡片数据，说明修复成功！
echo ========================================
pause
