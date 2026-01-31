@echo off
chcp 65001 >nul
cd /d C:\test\antinet\backend
echo 启动后端服务...
python main.py 2>&1 | findstr /C:"OK" /C:"WARNING" /C:"ERROR" /C:"路由" /C:"Uvicorn"
