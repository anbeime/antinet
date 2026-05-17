@echo off
chcp 65001 >nul
echo ========================================
echo zhiyi 全功能测试
echo ========================================
echo.

cd /d %~dp0

echo [1/3] 启动后端(如果未运行)...
tasklist /FI "IMAGENAME eq python.exe" 2>nul | findstr /i "python" >nul
if errorlevel 1 (
    echo 后端未运行，正在启动...
    start "zhiyi-backend" cmd /k "cd /d C:\D\zhiyi\backend && venv_arm64\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
    echo 等待后端启动(5秒)...
    timeout /t 5 /nobreak >nul
) else (
    echo 后端已在运行
)

echo.
echo [2/3] 检查前端(如果未运行)...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | findstr /i "node" >nul
if errorlevel 1 (
    echo 前端未运行，请手动启动: cd C:\D\zhiyi ^&^& npm run dev
) else (
    echo 前端已在运行
)

echo.
echo [3/3] 运行测试...
cd /d C:\D\zhiyi\backend
call venv_arm64\Scripts\python.exe test_all.py --skip-frontend

echo.
echo ========================================
echo 测试完成，按任意键退出...
pause >nul