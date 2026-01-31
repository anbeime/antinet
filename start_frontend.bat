@echo off
echo ====================================
echo 启动 Antinet 前端服务
echo ====================================
echo.

cd /d C:\test\antinet

echo [1/4] 检查依赖...
if not exist "node_modules" (
    echo [ERROR] node_modules 不存在，请先运行: pnpm install
    pause
    exit /b 1
)

echo [OK] 依赖检查完成
echo.

echo [2/4] 清理 Vite 缓存...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
)
echo [OK] 缓存清理完成
echo.

echo [3/4] 检查端口占用...
netstat -ano | findstr :3000
if %ERRORLEVEL% equ 0 (
    echo [WARN] 端口 3000 已被占用
    echo 请先关闭占用端口的进程
    pause
    exit /b 1
)
echo [OK] 端口检查完成
echo.

echo [4/4] 启动开发服务器...
echo.
echo ====================================
echo 前端服务即将启动...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务
echo ====================================
echo.

pnpm dev

pause
