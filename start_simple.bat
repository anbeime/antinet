@echo off
chcp 65001 > nul
echo ====================================
echo Antinet 智能知识管家 - 一键启动（NPU模式）
echo ====================================
echo.

cd /d %~dp0

REM 检查NPU环境
echo [检查] 验证NPU环境...
cd data-analysis-iteration
python -c "import qai_hub; print('NPU SDK OK')" 2>nul
if errorlevel 1 (
    echo [错误] NPU SDK未安装或不可用！
    echo.
    echo 必须使用NPU模式，不能使用模拟模式。
    echo 请确保已正确安装并配置NPU SDK。
    echo.
    pause
    exit /b 1
)
echo [OK] NPU环境正常
cd ..
echo.

echo [1/2] 启动后端服务（NPU加速）...
echo.
start "Antinet Backend" cmd /k "cd data-analysis-iteration && ..\venv_arm64\Scripts\python.exe main.py"

timeout /t 3 /nobreak > nul

echo [2/2] 启动前端服务...
echo.
start "Antinet Frontend" cmd /k "npm run dev"

echo.
echo ====================================
echo [OK] 启动完成！
echo ====================================
echo.
echo 访问地址:
echo   前端界面: http://localhost:3000
echo   后端API:  http://localhost:8000
echo   API文档:   http://localhost:8000/docs
echo.
echo 两个命令窗口会保持打开，按 Ctrl+C 可停止对应服务
echo.
pause
