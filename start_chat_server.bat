@echo off
chcp 65001 >nul
echo ============================================
echo   启动聊天服务器
echo ============================================
echo.

cd /d "C:\test\antinet\backend"

echo 正在启动聊天服务器...
echo 访问地址: http://localhost:8001
echo.
echo 按 Ctrl+C 停止服务器
echo.

python chat_server.py

pause
