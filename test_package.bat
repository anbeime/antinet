@echo off
chcp 65001 >nul
REM ================================================
REM   知易智能知识管家 - 打包测试脚本
REM ================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║          知易智能知识管家 - 打包测试工具                  ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d C:\D\zhiyi

echo [测试 1/4] 检查打包产物...
if not exist backend\dist\AntinetBackend\AntinetBackend.exe (
    echo ❌ 后端可执行文件不存在
    echo 请先运行: build_installer.bat
    pause
    exit /b 1
)
echo ✅ 后端可执行文件存在

if not exist dist\index.html (
    echo ❌ 前端构建产物不存在
    echo 请先运行: pnpm build
    pause
    exit /b 1
)
echo ✅ 前端构建产物存在

echo.
echo [测试 2/4] 测试后端启动...
cd backend\dist\AntinetBackend
start "Antinet Backend Test" AntinetBackend.exe
timeout /t 5 /nobreak >nul

REM 检查端口是否监听
netstat -ano | findstr :8000 >nul
if %errorLevel% equ 0 (
    echo ✅ 后端服务已启动 (端口 8000)
) else (
    echo ⚠️  后端服务可能未正常启动，请查看日志
)

echo.
echo [测试 3/4] 测试 API 响应...
curl -s http://localhost:8000/api/chat/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ API 响应正常
) else (
    echo ⚠️  API 无响应（可能需要更多启动时间）
)

echo.
echo [测试 4/4] 清理测试环境...
taskkill /FI "WINDOWTITLE eq Antinet Backend Test" /T /F >nul 2>&1
echo ✅ 测试进程已清理

echo.
echo ═══════════════════════════════════════════════════════════
echo   ✅ 测试完成！
echo ═══════════════════════════════════════════════════════════
echo.
echo 📋 测试结果总结:
echo   • 后端可执行文件: ✅
echo   • 前端静态文件: ✅
echo   • 服务启动: 见上方输出
echo   • API 响应: 见上方输出
echo.
echo 🎯 下一步:
echo   1. 如果测试通过，可以编译安装包
echo   2. 运行: build_installer.bat
echo   3. 在目标机器上测试安装包
echo.
pause
