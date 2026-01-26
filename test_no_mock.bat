@echo off
REM 验证无模拟功能测试脚本

echo.
echo ========================================
echo   验证无模拟功能测试
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在
    echo 请确保项目根目录下有 venv_arm64 虚拟环境
    pause
    exit /b 1
)

echo [运行] 开始验证...
echo.
venv_arm64\Scripts\python.exe test_no_mock.py

echo.
echo ========================================
echo   测试完成
echo ========================================
echo.
echo 如果所有测试通过（），说明系统未使用模拟功能。
echo 如果有测试失败（），请检查相关代码。
echo.
pause
