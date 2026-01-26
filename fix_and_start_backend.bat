@echo off
REM 修复并启动后端服务

echo ========================================
echo  修复前端API连接并启动后端
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [错误] 未找到 venv_arm64 虚拟环境
    echo 请先运行: setup_arm64_env.py
    pause
    exit /b 1
)

echo [1/3] 已修复前端API连接问题
echo   - Home.tsx 现在连接本地 NPU API (http://localhost:8000/api/health)
echo   - 不再连接错误的 GLM Flash 服务 (端口8910)
echo.

echo [2/3] 激活 ARM64 虚拟环境并启动后端...
call venv_arm64\Scripts\activate.bat

REM 启动后端（后台运行）
echo.
echo [3/3] 启动后端服务（端口8000）...
echo   等待服务启动（需要30-60秒）...
echo.

start /B python backend/main.py > backend_run.log 2>&1

REM 等待服务启动
echo 等待服务启动...
timeout /t 5 /nobreak > nul

REM 检查服务是否成功启动
echo.
echo 检查服务状态...
curl -s http://localhost:8000/api/health 2>&1

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo [成功] 后端服务已启动！
    echo ========================================
    echo.
    echo 下一步：
    echo 1. 访问健康检查: http://localhost:8000/api/health
    echo 2. 刷新前端页面
    echo 3. 运行NPU性能测试
    echo 4. 查看后端日志: type backend_run.log
    echo.
) else (
    echo.
    echo ========================================
    echo [警告] 服务启动可能需要更长时间
    echo ========================================
    echo.
    echo 请查看日志: type backend_run.log
    echo 或等待30-60秒后再次检查
    echo.
)

pause
