@echo off
REM NPU设备修复脚本
REM 用于解决错误代码14001（Failed to create device）

echo ============================================================
echo NPU设备修复工具
echo ============================================================
echo.

echo [1/4] 检查Python进程...
tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /I "python.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo 警告: 发现Python进程正在运行
    echo 可能占用NPU资源
    echo.
    echo 是否要终止所有Python进程? ^(Y/N^)
    choice /C YN /N /M "选择: "
    if %ERRORLEVEL% equ 1 (
        echo 正在终止Python进程...
        taskkill /F /IM python.exe >nul 2>&1
        taskkill /F /IM pythonw.exe >nul 2>&1
        echo 完成
    )
) else (
    echo 未发现Python进程
)

echo.
echo [2/4] 检查uvicorn进程...
tasklist /FI "IMAGENAME eq uvicorn.exe" 2>nul | find /I "uvicorn.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo 警告: 发现uvicorn进程正在运行
    taskkill /F /IM uvicorn.exe >nul 2>&1
    echo 已终止uvicorn进程
) else (
    echo 未发现uvicorn进程
)

echo.
echo [3/4] 等待资源释放...
timeout /t 3 /nobreak >nul

echo.
echo [4/4] 重新启动后端服务...
cd /d %~dp0
call start_backend.bat

echo.
echo ============================================================
echo 修复完成
echo ============================================================
echo.
echo 如果问题仍然存在，请尝试:
echo   1. 重启AIPC
echo   2. 检查Windows事件查看器中的NPU错误日志
echo   3. 确认NPU驱动正确安装
echo.
