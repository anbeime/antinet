@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Antinet 演示环境启动
echo ========================================
echo.

REM 检查端口8000是否被占用
echo 步骤1: 检查后端服务状态...
netstat -an | findstr ":8000.*LISTENING" >nul
if errorlevel 1 (
    echono 后端服务未运行
    echo.
    echo 启动后端服务...
    start "Antinet Backend" cmd /k "cd backend && ..\venv_arm64\Scripts\python main.py"
    echo ⏳ 等待后端启动 (约30-60秒)...
    timeout /t 40 /nobreak >nul
) else (
    echo 后端服务已在运行
)

echo.
echo 步骤2: 启动前端服务...
cd frontend
start "Antinet Frontend" cmd /k "npm run dev"
echo ⏳ 等待前端启动 (约10秒)...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo 访问地址: http://localhost:5173
echo.
echo 如果看到"后端服务未连接"提示，请:
echo 1. 等待30秒让后端完全启动
echo 2. 刷新浏览器页面 (F5)
echo.
echo 按任意键退出...
pause >nul
