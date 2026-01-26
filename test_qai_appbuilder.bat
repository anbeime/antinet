@echo off
chcp 65001 > nul
echo ========================================
echo 测试 qai_appbuilder 模块
echo ========================================
echo.

venv_arm64\Scripts\python.exe test_qai_appbuilder.py

if errorlevel 1 (
    echo.
    echono 测试失败
    pause
    exit /b 1
)

echo.
echo 所有测试通过
pause
