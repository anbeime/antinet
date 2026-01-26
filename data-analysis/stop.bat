@echo off
REM 停止Antinet后端服务 (Windows)

echo 停止Antinet后端服务...

REM 查找Python进程
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| find "python.exe"') do set python_pid=%%i

REM 移除引号
set python_pid=%python_pid:"=%

if "%python_pid%"=="" (
    echo 服务未运行
    exit /b 0
)

REM 停止服务
echo 正在停止服务 (PID: %python_pid%)...
taskkill /F /PID %python_pid%

echo 服务已停止
pause
