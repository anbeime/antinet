@echo off
echo ====================================
echo 启动 Antinet 后端并测试
echo ====================================

REM 检查并关闭占用8000端口的进程
echo.
echo [1/4] 检查端口8000占用情况...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 发现占用端口8000的进程: %%a
    taskkill /F /PID %%a
)

REM 启动后端（新窗口）
echo.
echo [2/4] 启动后端服务...
start "Antinet Backend" cmd /k "c:\test\antinet\venv_arm64\Scripts\activate.bat && cd /d c:\test\antinet\backend && python main.py"

REM 等待服务启动
echo.
echo [3/4] 等待后端服务启动...
timeout /t 5 /nobreak

REM 测试API
echo.
echo [4/4] 测试API端点...
c:\test\antinet\venv_arm64\Scripts\python.exe c:\test\antinet\backend\test_api_endpoints.py

echo.
echo ====================================
echo 完成！
echo ====================================
pause
