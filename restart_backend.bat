@echo off
echo ====================================
echo 重启 Antinet 后端服务
echo ====================================
echo.

cd /d C:\test\antinet

echo [1/3] 查找并关闭现有后端进程...
for /f "tokens=2" %%a in ('tasklist ^| findstr python') do (
    echo 找到进程 PID: %%a，正在终止...
    taskkill /PID %%a /F 2>nul
)
timeout /t 2 /nobreak >nul
echo [OK] 进程已清理
echo.

echo [2/3] 等待端口释放...
timeout /t 3 /nobreak >nul
echo [OK] 端口已释放
echo.

echo [3/3] 启动后端服务...
echo.
echo ====================================
echo 后端服务即将启动...
echo 访问地址: http://localhost:8000
echo 按 Ctrl+C 停止服务
echo ====================================
echo.

C:\test\antinet\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
